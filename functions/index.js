const functions = require('firebase-functions');
const config = require('./config');
const jwt = require('jsonwebtoken');

// Allow requests from *.vaccine-ontario.ca, and from the Google Cloud functions domain that this function runs on
const cors = require('cors')({ origin: [/\.vaccine-ontario\.ca$/, "https://us-central1-grassroots-gpay.cloudfunctions.net"] });
//const cors = require('cors')({ origin: true });

exports.googlesign = functions.https.onRequest((request, response) => {
    /*
        VERY IMPORTANT WARNING!!!!! VERY IMPORTANT WARNING!!!!! VERY IMPORTANT WARNING!!!!!
    
        The Google Pay API requires us to sign the entire Google Pass contents with this function - this is different
        from Apple Wallet which signs hashes of the content. This means that it is UNAVOIDABLE that potentially
        personally identifiable information will flow through this function if we wish to provide this functionality,
        since the SHC QR code contains person name and birthdate. Given the unavoidability of transmission, it is
        ABSOLUTELY VITAL that NO logging of any of that data happens within this function!! This function has been
        implemented so that all of the logic is inliine and as simple as possible to reduce the chance of unintentional
        logging and to make understanding of the overall logic as simple as possible for readers so it can be verified
        without much effort that no PII recording occurs within this function.
    
        VERY IMPORTANT WARNING!!!!! VERY IMPORTANT WARNING!!!!! VERY IMPORTANT WARNING!!!!!
    */
    cors(request, response, async (err) => {

        // Kick out anything that is not valid according to our CORS rules
        if (err) {
            // Denied by CORS/error with CORS configuration
            console.error("CORS blocked request -> ", err);
            response.status(403).send("Forbidden by CORS");
            return;
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // STEP 1: declare a bunch of constants at the top, C-style, to make it easier to understand
        // the logic below by using descriptive variable names.
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        const qrCode = request.body.payloadBody.rawData;
        const shcReceipt = request.body.payloadBody.shcReceipt;
        const vaccinations = shcReceipt.vaccinations;

        const passIssuerId = config.issuerIdCovidcard;
        const passIssuerEmail = config.credentials.client_email;
        const passIssuerPrivateKey = config.credentials.private_key;

        // The pass ID combines both the issuer and our unique pass ID
        const passId = `${passIssuerId}.${request.body.id}`;

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // STEP 2: Separate out our vaccination records into the format Google Pay wants them in.
        // Loop through each our vaccination records and prepare them for adding to the pass.
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        const passVaccinationRecords = [];
        for (let i = 0; i < vaccinations.length; i++) {
            const vaccination = vaccinations[i];
            const vaccinationRecord = {
                doseDateTime: vaccination.vaccinationDate,
                manufacturer: vaccination.vaccineName,
                provider: vaccination.organization,
                doseLabel: `Dose ${i + 1}`
            };
            
            // Dump this constructed object int our overall list of vaccination records for
            // inclusion in the Google Pay pass
            passVaccinationRecords.push(vaccinationRecord);
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // STEP 3: Construct the body of the Google Pay pass we will return to the user.
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        const passContents = {
            id: passId,
            issuerId: passIssuerId,
            title: `COVID-19 Vaccination Card, ${shcReceipt.cardOrigin}`,
            patientDetails: {
                dateOfBirth: shcReceipt.dateOfBirth,
                patientName: shcReceipt.name
            },
            vaccinationDetails: {
                vaccinationRecord: passVaccinationRecords
            },
            barcode: {
                type: 'qrCode',
                value: qrCode,
            },
            cardColorHex: '#FFFFFF',
            logo: {
                sourceUri: {
                    uri: 'https://www.gstatic.com/images/icons/material/system_gm/2x/gpp_good_black_48dp.png'
                }
            },
        };

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // STEP 4: Create our JWT Claims object which will be used to sign this Google Pass. Please note that
        // the body of the pass is included in this claims object.
        //
        // The fields 'aud', 'iat', and 'typ' are constants defined by Google in
        // https://developers.google.com/pay/passes/guides/covid-cards/get-started
        // however that URL is only accessible if you have been granted access to the COVID card API -
        // it is a 404 otherwise.
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        const claims = {
            aud: 'google',
            iat: 1620349632,
            typ: 'savetogooglepay',
            iss: passIssuerEmail,
            payload: {covidCardObjects: [passContents]}
        };

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // STEP 5: Sign our JWT and create our return token
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        const token = jwt.sign(claims, passIssuerPrivateKey, {algorithm: 'RS256'});

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // STEP 6: Send this token back as our response now that signing is complete
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        response.json({token});

        // Log only the pass ID so we have an indication in the logs of a successful run by this function
        console.info(`Pass with ID ${passId} successfully created and returned to user`);
    });
});
