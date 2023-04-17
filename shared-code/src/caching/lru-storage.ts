import LRU from 'lru-cache';
import { Knex } from 'knex';
import { CACHING_CONSTANTS } from './caching-constants.js';
import {
  ConnectionAgentParams,
  ConnectionParams,
} from '../data-access-layer/shared/data-structures/connections-params.ds.js';
import { ForeignKeyDS } from '../data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '../data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '../data-access-layer/shared/data-structures/table-structure.ds.js';
const knexCache = new LRU(CACHING_CONSTANTS.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRU(CACHING_CONSTANTS.DEFAULT_TUNNEL_CACHE_OPTIONS);
const tableStructureCache = new LRU(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tableForeignKeysCache = new LRU(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tablePrimaryKeysCache = new LRU(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);

export class LRUStorage {
  public static getCachedKnex(connectionConfig: ConnectionParams): Knex | null {
    const cachedKnex = knexCache.get(JSON.stringify(connectionConfig)) as Knex;
    return cachedKnex ? cachedKnex : null;
  }

  public static setKnexCache(connectionConfig: ConnectionParams, newKnex: Knex): void {
    knexCache.set(JSON.stringify(connectionConfig), newKnex);
  }

  public static getTunnelCache(connection: ConnectionParams): any {
    const cachedTnl = tunnelCache.get(JSON.stringify(connection));
    return cachedTnl ? cachedTnl : null;
  }

  public static setTunnelCache(connection: ConnectionParams, tnlObj: Record<string, unknown>): void {
    tunnelCache.set(JSON.stringify(connection), tnlObj);
  }

  public static delTunnelCache(connection: ConnectionParams): void {
    tunnelCache.delete(JSON.stringify(connection));
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
}
