// Copyright 2020 Google LLC. All rights reserved.
// Use of this source code is governed by the Apache 2.0
// license that can be found in the LICENSE file.
require('dotenv').config();

const { laravelContainerUrl } = require('./constants/laravelApi');
const { topicName } = require('./constants/project');

const express = require('express');
const app = express();

const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub();
const topic = pubsub.topic(topicName);

const axios = require('axios');

app.use(express.json());

app.get('/', async (req, res) => {
  const message = {
    name: req.query.name || null,
    lastName: req.query.lastName || null,
    email: req.query.email || null,
    password: req.query.password || null,
    phoneNumber: req.query.phoneNumber || null,
  }

  try {
    console.log(`Publising new message...`);

    const messageId = await topic.publishMessage({ json: message });

    res.status(200).json({
      message: {
        ...message,
        id: messageId
      }
    });
  } catch (err) {
    console.error(err);

    res.status(500).send(err);
  }
});

app.post('/message', async (req, res) => {
  const errors = {};

  console.log(`Trying to receive new message...`);

  if (!req.body) {
    console.log('aaa', req)
    errors.body = 'Body request not received';
  }

  if (!req.body.message) {
    errors.message = 'Body request not received';
  }

  if (typeof req.body.message.data !== 'string') {
    errors.bodyMessageData = 'Message data not exists';
  }

  if (typeof req.body.message.data !== 'string') {
    errors.bodyMessageType = 'Body request not received';
  }

  if (Object.keys(errors).length > 0) {
    console.error(`Pub/Sub validation errors: ${JSON.stringify(errors)}`)
    return res.status(200).json(errors);
  }

  const message = (Buffer.from(req.body.message.data, 'base64')).toString();

  console.log(`Data received from trigger: ${message}`);

  try {
    const { data } = await axios.post(laravelContainerUrl, message);

    console.log(`Data received from LARAVEL CONTAINER ${laravelContainerUrl}: ${JSON.stringify(data)}`);

    res.status(201).json(data);
  } catch (err) {
    if (err.response.status === 400) {
      console.log(`Error to insert in LARAVEL CONTAINER ${laravelContainerUrl}: ${JSON.stringify(err.response.data)}`);

      res.status(200).json({ errors: err.response.data });
    } else {
      console.log(`Unexpected error to SEND TO LARAVEL CONTAINER ${laravelContainerUrl}: ${JSON.stringify(err.response.data)}`);

      res.status(200).send('Unexpected error');
    }
  }
});

module.exports = app;
