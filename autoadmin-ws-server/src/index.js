'use strict';
const express = require('express');
const axios = require('axios').default;
const app = express();
const http = require('http');
const httpServer = require('http').Server(app);
const wsServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end();
});
const WebSocket = require('ws');
const router = express.Router();
const commandRoute = require('./routes/command');
const wsConnections = require('./controllers/ws-connections');
const CONSTANTS = require('./constants/constants');
const COMMAND_TYPE = require('./constants/command-type');
const Command = require('./controllers/command');
const crypto = require('crypto');
const LRU = require('lru-cache');

const httpPort = process.env.HTTP_PORT || 8008;
const wsPort = process.env.WS_PORT || 8009;
const hostname = process.env.HOST || '172.16.0.0'; //172.16.0.0
const privateKey = process.env.PRIVATE_KEY;
const tokenCacheResult = new LRU(CONSTANTS.TOKEN_RESULT_CACHE_OPTIONS);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: CONSTANTS.API_IS_RUNNING });
});

app.use('/', commandRoute);

wsServer.listen(wsPort, () => {
  console.log(`Web socket server listening on port: ${wsPort}`);
});

const ws = new WebSocket.Server({ server: wsServer });

ws.on('connection', (connection, req) => {
  const ip = req.socket.remoteAddress;
  // console.log(`Connected ${ip}`);

  connection.on('message', async message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log('-> e.message', e.message);
      return;
    }
    const { operationType, resId } = data;

    if (data.connectionToken && operationType && operationType === COMMAND_TYPE.initialConnection) {
      if (!await checkConnectionToken(data.connectionToken)) {
        connection.close(1003, CONSTANTS.CONNECTION_TOKEN_INCORRECT);
      }
      const hmac = crypto.createHmac('sha256', privateKey);
      hmac.update(data.connectionToken);
      data.connectionToken = hmac.digest('hex');
    }

    const cachedConnection = wsConnections.getCacheWsConnection(data.connectionToken);
    if (!cachedConnection) {
      wsConnections.cacheWsConnection(data.connectionToken, connection);
    }
    if (cachedConnection && cachedConnection.readyState !== WebSocket.OPEN) {
      wsConnections.delCachedWsConnection(data.connectionToken);
      wsConnections.cacheWsConnection(data.connectionToken, connection);
    }
    if (operationType === COMMAND_TYPE.dataFromAgent) {
      const cachedResponse = Command.getCachedResponse(resId);
      if (cachedResponse) {
        cachedResponse.send(message);
        Command.delCachedResponse(resId);
      }
    }
  });

  connection.on('close', () => {
    // console.log(`Disconnected ${ip}`);
  });

});

httpServer.listen(httpPort, hostname, () => {
  console.log(`Http server listening host: ${hostname} on port: ${httpPort}`);
});

async function checkConnectionToken(connectionToken) {
  if (!connectionToken) return false;
  const cachedTokenResult = tokenCacheResult.get(connectionToken);
  if (cachedTokenResult) {
    return true;
  }
  try {
    let checkConnectionTokenUrl; 
    if(process.env.CHECK_CONNECTION_TOKEN_URL) {
      checkConnectionTokenUrl = `${process.env.CHECK_CONNECTION_TOKEN_URL}?token=${connectionToken}`
    } else {
      checkConnectionTokenUrl = `http://autoadmin-internal-auth.local:3000/connection/token?token=${connectionToken}`;
    }   
    const response = await axios.get(checkConnectionTokenUrl);
    if (response.status !== 200) {
      return false;
    }
    const result = (response.data === true);
    if (result) {
      tokenCacheResult.set(connectionToken, true);
    }
    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
}
