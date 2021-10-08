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

const { GaxiosError } = require('gaxios');
const { GoogleAuth } = require('google-auth-library');
const config = require('./config');

class PassesClient {
  constructor() {
    this._clientPromise = null;
  }

  async _getPassesClient() {
    if (!this._clientPromise) {
      const authOptions = {
        scopes: 'https://www.googleapis.com/auth/wallet_object.issuer',
      };

      authOptions.credentials = config.credentials;

      const auth = new GoogleAuth(authOptions);
      this._clientPromise = auth.getClient();
    }

    return this._clientPromise;
  }

  async get(url) {
    return await this._request(url, 'GET');
  }

  async post(url, jsonBody) {
    return await this._request(url, 'POST', jsonBody);
  }

  async put(url, jsonBody) {
    return await this._request(url, 'PUT', jsonBody);
  }

  async postIfNotFound(postUrl, jsonBody, resourceId) {
    try {
      return await this.get([postUrl.replace(/\/$/, ''), resourceId.replace(/^\//, '')].join('/'));
    } catch (err) {
      if (err instanceof GaxiosError && err.response.status === 404) {
        return await this.post(postUrl, jsonBody);
      }
      throw err;
    }
  }

  async patch(url, jsonBody) {
    return await this._request(url, 'PATCH', jsonBody);
  }

  async _request(url, method, jsonBody) {
    const client = await this._getPassesClient();

    return (
      await client.request({
        url: url,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonBody ? JSON.stringify(jsonBody) : undefined,
      })
    ).data;
  }
}

module.exports = PassesClient;
