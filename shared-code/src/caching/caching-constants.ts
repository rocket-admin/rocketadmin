import { Knex } from 'knex';
import { Database } from 'ibm_db';
import { MongoClientDB } from '../data-access-layer/data-access-objects/data-access-object-mongodb.js';
import { Client } from 'cassandra-driver';
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

  DEFAULT_IMDB_DB2_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (db: Database) => {
      await db.close();
    },
  },

  DEFAULT_CASSANDRA_CLIENT_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (client: Client) => {
      try {
        await client.shutdown();
      } catch (_e) {
        return;
      }
    },
  },

  DEFAULT_MONGO_DB_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (connectionData: MongoClientDB) => {
      await connectionData.dbClient.close();
    },
  },

  DEFAULT_REDIS_CLIENT_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (client: any) => {
      try {
        await client.quit();
      } catch (_e) {
        return;
      }
    },
  },

  DEFAULT_TUNNEL_CACHE_OPTIONS: {
    max: 100,
    ttl: 1000 * 60 * 60,
    dispose: async (tnl: any) => {
      try {
        await tnl?.server?.close();
        await tnl?.client?.destroy();
        await tnl?.database?.close();
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
