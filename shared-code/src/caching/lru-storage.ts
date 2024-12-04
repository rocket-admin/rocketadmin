import { LRUCache } from 'lru-cache';
import { Knex } from 'knex';
import { CACHING_CONSTANTS } from './caching-constants.js';
import {
  ConnectionAgentParams,
  ConnectionParams,
} from '../data-access-layer/shared/data-structures/connections-params.ds.js';
import { ForeignKeyDS } from '../data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '../data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '../data-access-layer/shared/data-structures/table-structure.ds.js';
import { Database } from 'ibm_db';
import { MongoClientDB } from '../data-access-layer/data-access-objects/data-access-object-mongodb.js';
const knexCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TUNNEL_CACHE_OPTIONS);
const imdbDb2Cache = new LRUCache(CACHING_CONSTANTS.DEFAULT_IMDB_DB2_CACHE_OPTIONS);
const mongoDbCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_MONGO_DB_CACHE_OPTIONS);
const tableStructureCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tableForeignKeysCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tablePrimaryKeysCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);

export class LRUStorage {
  public static setMongoDbCache(connection: ConnectionParams, newDb: MongoClientDB): void {
    mongoDbCache.set(this.getConnectionIdentifier(connection), newDb);
  }

  public static getMongoDbCache(connection: ConnectionParams): MongoClientDB | null {
    const cachedDb = mongoDbCache.get(this.getConnectionIdentifier(connection)) as MongoClientDB;
    return cachedDb ? cachedDb : null;
  }

  public static getImdbDb2Cache(connection: ConnectionParams): Database | null {
    const cachedDb = imdbDb2Cache.get(this.getConnectionIdentifier(connection)) as Database;
    return cachedDb ? cachedDb : null;
  }

  public static setImdbDb2Cache(connection: ConnectionParams, newDb: Database): void {
    imdbDb2Cache.set(this.getConnectionIdentifier(connection), newDb);
  }

  public static getCachedKnex(connectionConfig: ConnectionParams): Knex | null {
    const cachedKnex = knexCache.get(this.getConnectionIdentifier(connectionConfig)) as Knex;
    return cachedKnex ? cachedKnex : null;
  }

  public static setKnexCache(connectionConfig: ConnectionParams, newKnex: Knex): void {
    knexCache.set(this.getConnectionIdentifier(connectionConfig), newKnex);
  }

  public static delKnexCache(connectionConfig: ConnectionParams): void {
    knexCache.delete(this.getConnectionIdentifier(connectionConfig));
  }

  public static getTunnelCache(connection: ConnectionParams): any {
    const cachedTnl = tunnelCache.get(this.getConnectionIdentifier(connection));
    return cachedTnl ? cachedTnl : null;
  }

  public static setTunnelCache(connection: ConnectionParams, tnlObj: Record<string, unknown>): void {
    tunnelCache.set(this.getConnectionIdentifier(connection), tnlObj);
  }

  public static delTunnelCache(connection: ConnectionParams): void {
    tunnelCache.delete(this.getConnectionIdentifier(connection));
  }

  public static setTableForeignKeysCache(
    connection: ConnectionParams | ConnectionAgentParams,
    tableName: string,
    foreignKeys: Array<ForeignKeyDS>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tableForeignKeysCache.set(cacheObj, foreignKeys);
  }

  public static getTableForeignKeysCache(
    connection: ConnectionParams | ConnectionAgentParams,
    tableName: string,
  ): Array<ForeignKeyDS> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundKeys = tableForeignKeysCache.get(cacheObj) as Array<ForeignKeyDS>;
    return foundKeys ? foundKeys : null;
  }

  public static setTablePrimaryKeysCache(
    connection: ConnectionParams | ConnectionAgentParams,
    tableName: string,
    primaryKeys: Array<PrimaryKeyDS>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tablePrimaryKeysCache.set(cacheObj, primaryKeys);
  }

  public static getTablePrimaryKeysCache(
    connection: ConnectionParams | ConnectionAgentParams,
    tableName: string,
  ): Array<PrimaryKeyDS> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundKeys = tablePrimaryKeysCache.get(cacheObj) as Array<PrimaryKeyDS>;
    return foundKeys ? foundKeys : null;
  }

  public static getTableStructureCache(
    connection: ConnectionParams | ConnectionAgentParams,
    tableName: string,
  ): Array<TableStructureDS> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundStructure = tableStructureCache.get(cacheObj) as Array<TableStructureDS>;
    return foundStructure ? foundStructure : null;
  }

  public static setTableStructureCache(
    connection: ConnectionParams | ConnectionAgentParams,
    tableName: string,
    structure: Array<TableStructureDS>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tableStructureCache.set(cacheObj, structure);
  }

  public static getConnectionIdentifier(connectionParams: ConnectionParams | ConnectionAgentParams): string {
    if (this.isConnectionAgentParams(connectionParams)) {
      const cacheObj = {
        id: connectionParams.id,
        token: connectionParams.token,
        signing_key: connectionParams.signing_key,
      };
      return JSON.stringify(cacheObj);
    }
    if (connectionParams.isTestConnection) {
      return connectionParams.host;
    }
    if (connectionParams.ssh) {
      const cacheObj = {
        id: connectionParams.id,
        signing_key: connectionParams.signing_key,
        type: connectionParams.type,
        username: connectionParams.username,
        database: connectionParams.database,
      };
      return JSON.stringify(cacheObj);
    }
    const cacheObj = {
      id: connectionParams.id,
      signing_key: connectionParams.signing_key,
      host: connectionParams.host,
      port: connectionParams.port,
      username: connectionParams.username,
      database: connectionParams.database,
    };
    return JSON.stringify(cacheObj);
  }

  public static isConnectionAgentParams(
    connectionParams: ConnectionParams | ConnectionAgentParams,
  ): connectionParams is ConnectionAgentParams {
    if (connectionParams.hasOwnProperty('token') && connectionParams['token']) {
      return true;
    }
    return false;
  }
}
