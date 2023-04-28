const { nanoid } = require('nanoid');
const LRU = require('lru-cache');
const CONSTANTS = require('../constants/constants');
const COMMAND_TYPE = require('../constants/command-type');
const wsConnections = require('../controllers/ws-connections');
const resCache = new LRU(CONSTANTS.WS_CACHE_OPTIONS);

module.exports.executeCommand = async (req, res) => {
  const connectionToken = req.connectionToken.token;
  const resId = await nanoid();
  req.body.resId = resId;
  resCache.set(resId, res);
  try {
    wsConnections.sendCommandToWsClient(connectionToken, req.body, resId);
  } catch (e) {
    console.log('Command execution error ->', e.message);
  }
};

module.exports.getCachedResponse = (responseId) => {
  return resCache.get(responseId);
};

module.exports.delCachedResponse = (responseId) => {
  resCache.del(responseId);
};
