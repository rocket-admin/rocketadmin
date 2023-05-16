import { LRUCache } from 'lru-cache'
import { CONSTANTS } from '../constants/constants.js';
import WebSocket from 'ws';
import { getCachedResponse, delCachedResponse } from './command.js';
const clientsCache = new LRUCache(CONSTANTS.WS_CACHE_OPTIONS);

export function cacheWsConnection(connectionToken, wsConnection) {
  clientsCache.set(connectionToken, wsConnection);
}

export function getCacheWsConnection(connectionToken) {
  return clientsCache.get(connectionToken);
}

export function delCachedWsConnection(connectionToken) {
  clientsCache.delete(connectionToken);
}

export function sendCommandToWsClient(connectionToken, receivedData, resId) {
  const cachedConnection = clientsCache.get(connectionToken);
  const data = {
    connectionToken: connectionToken,
    data: receivedData,
  };
  if (cachedConnection) {
    if (cachedConnection.readyState === WebSocket.OPEN) {
      try {
        cachedConnection.send(JSON.stringify(data));
      } catch (e) {
        console.log('-> Error sending command to client', e.message);
      }
    } else {
      clientsCache.delete(connectionToken);
      const cachedResponse = getCachedResponse(resId);
      if (cachedResponse) {
        cachedResponse.status(523).send(CONSTANTS.CLIENT_NOT_CONNECTED);
        delCachedResponse(resId);
      }
    }
  } else {
    const cachedResponse = getCachedResponse(resId);
    if (cachedResponse) {
      cachedResponse.status(523).send(CONSTANTS.CLIENT_NOT_CONNECTED);
      delCachedResponse(resId);
    }
  }
}