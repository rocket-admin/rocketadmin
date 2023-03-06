export const Constants = {
  DEFAULT_PAGINATION: { page: 1, perPage: 20 },
  DEFAULT_LOGS_DIRNAME: 'logs',
  DEFAULT_LOGS_FILENAME: 'autoadmin-logs.txt',
  DEFAULT_CONNECTION_CACHE_OPTIONS: {
    max: 50,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (knex, key) => {
      await knex.destroy();
    },
  },
  AUTOCOMPLETE_ROW_LIMIT: 20,
  CLI_ATTEMPTS_COUNT: 3,
  CLI_QUIT_COMMAND: '$quit',
};
