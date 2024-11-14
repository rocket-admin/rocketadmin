export const Constants = {
  FORBIDDEN_HOSTS: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', 'fd00::/8'],
  COUNT_QUERY_TIMEOUT_MS: 2000,
  LARGE_DATASET_SIZE: 100000,
  DEFAULT_PAGINATION: { page: 1, perPage: 20 },
  DEFAULT_LOGS_DIRNAME: 'logs',
  DEFAULT_LOGS_FILENAME: 'autoadmin-logs.txt',
  KEEP_ALIVE_INTERVAL: 30000,
  KEEP_ALIVE_COUNT_MAX: 120,
  DEFAULT_CONNECTION_CACHE_OPTIONS: {
    max: 50,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (knex, _key) => {
      await knex.destroy();
    },
  },

  DEFAULT_TUNNEL_CACHE_OPTIONS: {
    max: 100,
    ttl: 1000 * 60 * 60,
    dispose: async (tnl: any) => {
      try {
        await tnl.close();
      } catch (e) {
        console.error('Tunnel closing error: ' + e);
      }
    },
  },

  DEFAULT_DRIVER_CACHE_OPTIONS: {
    max: 50,
    ttl: 1000 * 60 * 60,
  },

  DEFAULT_SETTINGS_CACHE_OPTIONS: {
    max: 1000,
    ttl: 1000 * 60 * 60,
  },

  DEFAULT_CONNECTIONS_CACHE_OPTIONS: {
    max: 1000,
    ttl: 1000 * 60 * 60,
  },

  DEFAULT_FORWARD_IN_HOST: '127.0.0.1',
  AUTOCOMPLETE_ROW_LIMIT: 20,
  CLI_ATTEMPTS_COUNT: 3,
  CLI_QUIT_COMMAND: '$quit',
};
