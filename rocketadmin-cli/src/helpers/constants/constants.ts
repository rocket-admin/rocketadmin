export const Constants = {
  DEFAULT_PAGINATION: { page: 1, perPage: 20 },
  DEFAULT_LOGS_DIRNAME: 'logs',
  DEFAULT_LOGS_FILENAME: 'autoadmin-logs.txt',
  DEFAULT_CONNECTION_CACHE_OPTIONS: {
    max: 50,
    length: function (n, key) {
      return n * 2 + key.length;
    },
    dispose: async function (key, n) {
      await n.destroy();
    },
    maxAge: 1000 * 60 * 60,
  },
  AUTOCOMPLETE_ROW_LIMIT: 20,
  CLI_ATTEMPTS_COUNT: 3,
  CLI_QUIT_COMMAND: '$quit',
};
