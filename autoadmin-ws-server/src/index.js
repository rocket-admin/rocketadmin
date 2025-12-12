import express, { Router, json } from 'express';
import axios from 'axios';
const app = express();
import { createServer } from 'http';
const httpServer = createServer(app);
const wsServer = createServer((req, res) => {
  res.writeHead(200);
  res.end();
});
import WebSocket, { WebSocketServer } from 'ws';
const router = Router();
import commandRoute from './routes/command.js';
import {
  getCacheWsConnection,
  cacheWsConnection,
  delCachedWsConnection,
} from './controllers/ws-connections.js';
import { COMMAND_TYPE } from './constants/command-type.js';
import { CONSTANTS } from './constants/constants.js';
import { getCachedResponse, delCachedResponse } from './controllers/command.js';
import { createHmac } from 'crypto';
import { LRUCache } from 'lru-cache';

const httpPort = process.env.HTTP_PORT || 8008;
const wsPort = process.env.WS_PORT || 8009;
const hostname = process.env.HOST || '172.16.0.0'; //172.16.0.0
const privateKey = process.env.PRIVATE_KEY;
const tokenCacheResult = new LRUCache(CONSTANTS.TOKEN_RESULT_CACHE_OPTIONS);

app.use(json());

app.get('/', (req, res) => {
  res.json({ status: CONSTANTS.API_IS_RUNNING });
});

app.use('/', commandRoute);

wsServer.listen(wsPort, () => {
  console.log(`Web socket server listening on port: ${wsPort}`);
});

const ws = new WebSocketServer({ server: wsServer });

ws.on('connection', (connection, req) => {
  const ip = req.socket.remoteAddress;
  // console.log(`Connected ${ip}`);

  connection.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log('-> e.message', e.message);
      return;
    }
    const { operationType, resId } = data;

    if (
      data.connectionToken &&
      operationType &&
      operationType === COMMAND_TYPE.initialConnection
    ) {
      if (!(await checkConnectionToken(data.connectionToken))) {
        connection.close(1003, CONSTANTS.CONNECTION_TOKEN_INCORRECT);
      }
      const hmac = createHmac('sha256', privateKey);
      hmac.update(data.connectionToken);
      data.connectionToken = hmac.digest('hex');
    }

    const cachedConnection = getCacheWsConnection(data.connectionToken);
    if (!cachedConnection) {
      cacheWsConnection(data.connectionToken, connection);
    }
    if (cachedConnection && cachedConnection.readyState !== WebSocket.OPEN) {
      delCachedWsConnection(data.connectionToken);
      cacheWsConnection(data.connectionToken, connection);
    }
    if (operationType === COMMAND_TYPE.dataFromAgent) {
      const cachedResponse = getCachedResponse(resId);
      if (cachedResponse) {
        cachedResponse.send(message);
        delCachedResponse(resId);
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
    if (process.env.CHECK_CONNECTION_TOKEN_URL) {
      checkConnectionTokenUrl = `${process.env.CHECK_CONNECTION_TOKEN_URL}?token=${connectionToken}`;
    } else {
      checkConnectionTokenUrl = `http://autoadmin-internal-auth.local:3000/connection/token?token=${connectionToken}`;
    }
    console.info('-> checkConnectionTokenUrl', checkConnectionTokenUrl);
    const response = await axios.get(checkConnectionTokenUrl);
    if (response.status !== 200) {
      console.info('-> response.status', response.status);
      console.info('-> response.data', response.data);
      return false;
    }
    const result = !!response.data.isValid;
    if (result) {
      tokenCacheResult.set(connectionToken, true);
    }
    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
}
