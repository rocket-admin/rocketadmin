import { nanoid } from 'nanoid';
import { LRUCache } from 'lru-cache'
import { CONSTANTS } from '../constants/constants.js';
import { sendCommandToWsClient } from '../controllers/ws-connections.js';
const resCache = new LRUCache(CONSTANTS.WS_CACHE_OPTIONS);

export async function executeCommand(req, res) {
  const connectionToken = req.connectionToken.token;
  const resId = nanoid();
  req.body.resId = resId;
  resCache.set(resId, res);
  try {
    sendCommandToWsClient(connectionToken, req.body, resId);
  } catch (e) {
    console.log('Command execution error ->', e.message);
  }
}

export function getCachedResponse(responseId) {
  return resCache.get(responseId);
}

export function delCachedResponse(responseId) {
  resCache.delete(responseId);
}
