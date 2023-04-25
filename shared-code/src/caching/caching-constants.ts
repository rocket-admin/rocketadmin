import { Knex } from 'knex';
export const CACHING_CONSTANTS = {
  DEFAULT_CONNECTION_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (knex: Knex) => {
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
  DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60,
  },
};
