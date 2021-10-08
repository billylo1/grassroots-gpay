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

const functions = require('firebase-functions');

const firebaseConfig = Object.assign({ loyalty: {} }, functions.config());

function getCredentials() {
  let credentials = firebaseConfig.loyalty.credentials;

  if (!credentials) {
    const envCredentials = process.env.GCP_CREDENTIALS;
    if (!envCredentials) {
      throw new Error('GCP_CREDENTIALS environment variable is empty.');
    }
    if (envCredentials.startsWith('{')) {
      credentials = JSON.parse(envCredentials);
    }
    credentials = require(envCredentials);
  }

  if (!credentials) {
    throw new Error('Unable to load credentials.');
  }

  return credentials;
}

module.exports = {
  credentials: getCredentials(),
  issuerId: firebaseConfig.loyalty.issuer_id || process.env.GOOGLE_PAY_ISSUER_ID,
  website: firebaseConfig.loyalty.website || process.env.LOYALTY_WEBSITE,
  loyaltyProgram: firebaseConfig.loyalty.loyalty_program || process.env.LOYALTY_PROGRAM,
};
