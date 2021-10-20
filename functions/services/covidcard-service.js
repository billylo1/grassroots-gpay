/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const config = require('../config');
const PassesClient = require('../passes-client');

function getCovidcardId(id) {
  const { issuerIdCovidcard } = config;
  return `${issuerIdCovidcard}.${id}`;
}

/**
 * Creates and posts a covidcardObject
 *
 * @param {object} receiptPayload
 * @return {Promise<object>} covidcardObject
 */
async function createCovidcardObject(payloadBody, id, qrCodeMessage) {
  const client = new PassesClient();

  // read issuerId and loyalty program from config
  const { issuerIdCovidcard } = config;
  const vaccinations = payloadBody.shcReceipt.vaccinations;

  let vaccinationRecords = [];
  for (let i = 0; i < vaccinations.length; i++) {
    const vaccination = vaccinations[i];
    const vaccinationRecord = {
      doseDateTime: vaccination.vaccinationDate,
      manufacturer: vaccination.vaccineName,
      provider: vaccination.organization,
      doseLabel: `Dose ${i + 1}`
    };
    vaccinationRecords.push(vaccinationRecord);
  }

  if (payloadBody.hasOwnProperty('rawData') && payloadBody.rawData.length > 0) {
    qrCodeMessage = payloadBody.rawData;      // shc:/
  }

  // Step 1: Construct the covidcardObject.
  const covidcardObject = {
    id: getCovidcardId(id),
    issuerId: issuerIdCovidcard,
    title: 'COVID-19 Vaccination Card',
    patientDetails: {
      dateOfBirth: payloadBody.shcReceipt.dateOfBirth,
      patientName: payloadBody.shcReceipt.name
    },
    vaccinationDetails: {
      vaccinationRecord: vaccinationRecords
    },
    barcode: {
      type: 'qrCode',
      value: qrCodeMessage,
    },
    cardColorHex: '#22FF33',
    "logo": {
      "sourceUri": {
        "description": "Grassroots",
        "uri": "https://www.gstatic.com/images/icons/material/system_gm/2x/healing_black_48dp.png"
      }
    },

  };

  console.log(JSON.stringify(covidcardObject, null, 2))

  // // Step 2: Insert the loyaltyObject.
  // await client.postIfNotFound(
  //   'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject',
  //   loyaltyObject,
  //   loyaltyObject.id,
  // );

  return covidcardObject;
}

module.exports = {
  createCovidcardObject
};
