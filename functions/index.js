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

const express = require('express');
const functions = require('firebase-functions');
const bodyParser = require('body-parser');
const { loyaltyRoutes } = require('./loyalty');
const cors = require('cors');

const app = express();
app.use(cors());
app.options('*', cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const routers = {
  '/loyalty': loyaltyRoutes,
};

// register apis with an additional /api path
Object.entries(routers).forEach(([path, router]) => {
  app.use(path, router);

  // also register the /api prefix for rewrites
  app.use(`/api${path}`, router);
});

exports.api = functions.https.onRequest(app);
