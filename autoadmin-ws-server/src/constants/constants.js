export const CONSTANTS = Object.freeze({
  AUTHORIZATION_FAILED: 'Authorization failed',
  NO_AUTHORIZATION_HEADER: 'No Authorization header',
  TOKEN_MISSING: 'Token missing',
  CONNECTION_TOKEN_MISSING: 'No connection token found',
  CONNECTION_TOKEN_INCORRECT: 'Connection token in incorrect',
  API_IS_RUNNING: 'API is running',
  UNKNOWN_COMMAND: 'Unknown command',
  CLIENT_NOT_CONNECTED: 'Client is not connected',

  WS_CACHE_OPTIONS: {
    max: 5000,
  },

  TOKEN_RESULT_CACHE_OPTIONS: {
    max: 5000,
    maxAge: 1000 * 60 * 5,
  },

  RES_CACHE_OPTIONS: {
    max: 5000,
    dispose: function(key, n) {
      n?.send('Connection was closed by timeout');
    },
    maxAge: 600000,
  },
});
