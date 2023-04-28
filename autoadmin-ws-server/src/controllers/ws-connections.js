const LRU = require('lru-cache');
const CONSTANTS = require('../constants/constants');
const WebSocket = require('ws');
const Command = require('./command');
const clientsCache = new LRU(CONSTANTS.WS_CACHE_OPTIONS);

module.exports.cacheWsConnection = (connectionToken, wsConnection) => {
  clientsCache.set(connectionToken, wsConnection);
};

module.exports.getCacheWsConnection = (connectionToken) => {
  return clientsCache.get(connectionToken);
};

module.exports.delCachedWsConnection = (connectionToken) => {
  clientsCache.del(connectionToken);
};

module.exports.sendCommandToWsClient = (connectionToken, receivedData, resId) => {
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
      clientsCache.del(connectionToken);
      const cachedResponse = Command.getCachedResponse(resId);
      if (cachedResponse) {
        cachedResponse.status(523).send(CONSTANTS.CLIENT_NOT_CONNECTED);
        Command.delCachedResponse(resId);
      }
    }
  } else {
    const cachedResponse = Command.getCachedResponse(resId);
    if (cachedResponse) {
      cachedResponse.status(523).send(CONSTANTS.CLIENT_NOT_CONNECTED);
      Command.delCachedResponse(resId);
    }
  }
};