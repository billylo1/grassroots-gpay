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

function getLoyaltyId(id) {
  const { issuerId, loyaltyProgram } = config;
  return `${issuerId}.${id}.${loyaltyProgram}`;
}

/**
 * Creates and posts a loyaltyObject
 *
 * @param {object} receiptPayload
 * @return {Promise<object>} loyaltyObject
 */
async function createLoyaltyObject(payloadBody, id, qrCodeMessage) {
  const client = new PassesClient();

  // read issuerId and loyalty program from config
  const { issuerId, loyaltyProgram } = config;
  const receipts = payloadBody.receipts;
  const firstReceipt = receipts['1'];
  const secondReceipt = receipts['2'];
  const firstReceiptDetails = firstReceipt ? `${firstReceipt.vaccineName} (${firstReceipt.vaccinationDate})` : '';
  const secondReceiptDetails = secondReceipt ? `${secondReceipt.vaccineName} (${secondReceipt.vaccinationDate})` : '';
  const receiptWithName = (firstReceipt ? firstReceipt : secondReceipt);
  const numDoses = Object.keys(receipts).length;
  const alternateText = `${receiptWithName.name} (${receiptWithName.dateOfBirth}) : ${numDoses} ${numDoses > 1 ? 'doses' : 'dose'}`;


  if (payloadBody.hasOwnProperty('rawData') && payloadBody.rawData.length > 0) {
    qrCodeMessage = payloadBody.rawData;      // shc:/
    // console.log(qrCodeMessage);
  }

  // Step 1: Construct the loyaltyObject.
  const loyaltyObject = {
    id: getLoyaltyId(id),
    classId: `${issuerId}.${loyaltyProgram}`,
    accountName: `${firstReceiptDetails}`,
    accountId: `${secondReceiptDetails}`,
    state: 'active',
    barcode: {
      type: 'qrCode',
      value: qrCodeMessage,
      alternateText: `${alternateText}`
    },

  };

  // Step 2: Insert the loyaltyObject.
  await client.postIfNotFound(
    'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject',
    loyaltyObject,
    loyaltyObject.id,
  );

  return loyaltyObject;
}

module.exports = {
  createLoyaltyObject
};
