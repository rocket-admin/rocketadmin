import { ForeignKeyDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { Knex } from 'knex';
import { LRUCache } from 'lru-cache';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { isSaaS } from '../app/is-saas.js';
import { Constants } from '../constants/constants.js';

const knexCache = new LRUCache(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRUCache(Constants.DEFAULT_TUNNEL_CACHE_OPTIONS);
const driverCache = new LRUCache(Constants.DEFAULT_DRIVER_CACHE_OPTIONS);
const invitationCache = new LRUCache(Constants.DEFAULT_INVITATION_CACHE_OPTIONS);
const tableStructureCache = new LRUCache(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tableForeignKeysCache = new LRUCache(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tablePrimaryKeysCache = new LRUCache(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tableReadPermissionCache = new LRUCache(Constants.DEFAULT_TABLE_PERMISSIONS_CACHE_OPTIONS);

export class Cacher {
  public static setUserTableReadPermissionCache(
    userId: string,
    connectionId: string,
    tableName: string,
    permission: boolean,
  ): void {
    const cacheKey = `${userId}-${connectionId}-${tableName}`;
    tableReadPermissionCache.set(cacheKey, permission);
  }

  public static getUserTableReadPermissionCache(
    userId: string,
    connectionId: string,
    tableName: string,
  ): boolean | null {
    const cacheKey = `${userId}-${connectionId}-${tableName}`;
    const permission = tableReadPermissionCache.get(cacheKey) as boolean;
    if (permission === null || permission === undefined) {
      return null;
    }
    return permission;
  }

  public static clearUserTableReadPermissionCache(userId: string, connectionId: string, tableName: string): void {
    const cacheKey = `${userId}-${connectionId}-${tableName}`;
    tableReadPermissionCache.delete(cacheKey);
  }

  public static increaseGroupInvitationsCacheCount(groupId: string): void {
    let groupCount = Cacher.getGroupInvitationCachedCount(groupId);
    invitationCache.set(groupId, ++groupCount);
    return;
  }

  public static increaseUserInvitationsCacheCount(userId: string): void {
    let userCount = Cacher.getUserInvitationCachedCount(userId);
    invitationCache.set(userId, ++userCount);
    return;
  }

  public static getUserInvitationCachedCount(userId: string): number {
    const cachedCount = invitationCache.get(userId) as number;
    return cachedCount ? cachedCount : 0;
  }

  public static getGroupInvitationCachedCount(groupId: string): number {
    const cachedCount = invitationCache.get(groupId) as number;
    return cachedCount ? cachedCount : 0;
  }

  public static canInvite(userId: string, groupId: string): boolean {
    if (!isSaaS()) {
      return true;
    }
    const userInvitations = Cacher.getUserInvitationCachedCount(userId);
    const groupInvitations = Cacher.getGroupInvitationCachedCount(groupId);
    return userInvitations <= 10 && groupInvitations <= 10;
  }

  public static getCachedKnex(connectionConfig): Knex {
    const cachedKnex = knexCache.get(JSON.stringify(connectionConfig)) as Knex;
    return cachedKnex ? cachedKnex : null;
  }

  public static setKnexCache(connectionConfig, newKnex: Knex): void {
    knexCache.set(JSON.stringify(connectionConfig), newKnex);
  }

  public static getTunnelCache(connection: ConnectionEntity): any {
    const cachedTnl = tunnelCache.get(JSON.stringify(connection));
    return cachedTnl ? cachedTnl : null;
  }

  public static setTunnelCache(connection: ConnectionEntity, tnlObj): void {
    tunnelCache.set(JSON.stringify(connection), tnlObj);
  }

  public static delTunnelCache(connection: ConnectionEntity): void {
    tunnelCache.delete(JSON.stringify(connection));
  }

  public static getDriverCache(connection: ConnectionEntity): any {
    const cachedDriver = driverCache.get(JSON.stringify(connection));
    return cachedDriver ? cachedDriver : null;
  }

  public static setDriverCache(connection: ConnectionEntity, newDriver): void {
    driverCache.set(JSON.stringify(connection), newDriver);
  }

  public static delDriverCache(connection: ConnectionEntity): void {
    driverCache.delete(JSON.stringify(connection));
  }

  public static setTableStructureCache(
    connection: ConnectionEntity,
    tableName: string,
    structure: Array<TableStructureDS>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tableStructureCache.set(cacheObj, structure);
  }

  public static getTableStructureCache(connection: ConnectionEntity, tableName: string): Array<TableStructureDS> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundStructure = tableStructureCache.get(cacheObj) as Array<TableStructureDS>;
    return foundStructure ? foundStructure : null;
  }

  public static setTablePrimaryKeysCache(
    connection: ConnectionEntity,
    tableName: string,
    primaryKeys: Array<PrimaryKeyDS>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tablePrimaryKeysCache.set(cacheObj, primaryKeys);
  }

  public static getTablePrimaryKeysCache(connection: ConnectionEntity, tableName: string): Array<PrimaryKeyDS> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundKeys = tablePrimaryKeysCache.get(cacheObj) as Array<PrimaryKeyDS>;
    return foundKeys ? foundKeys : null;
  }

  public static setTableForeignKeysCache(
    connection: ConnectionEntity,
    tableName: string,
    foreignKeys: Array<ForeignKeyDS>,
  ): void {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    tableForeignKeysCache.set(cacheObj, foreignKeys);
  }

  public static getTableForeignKeysCache(connection: ConnectionEntity, tableName: string): Array<ForeignKeyDS> {
    const connectionCopy = {
      ...connection,
    };
    const cacheObj = JSON.stringify({ connectionCopy, tableName });
    const foundKeys = tableForeignKeysCache.get(cacheObj) as Array<ForeignKeyDS>;
    return foundKeys ? foundKeys : null;
  }

  public static async clearAllCache(): Promise<void> {
    const elements = [];
    knexCache.forEach((value, key) => {
      elements.push({ key, value });
    });
    for (const element of elements) {
      await element.value.destroy();
      knexCache.delete(element.key);
    }
    knexCache.clear();

    const tunnelElements = [];
    tunnelCache.forEach((value, key) => {
      tunnelElements.push({ key, value });
    });
    for (const element of tunnelElements) {
      await element.value.close();
      tunnelCache.delete(element.key);
    }
    tunnelCache.clear();
    await driverCache.clear();
    await invitationCache.clear();
    await tableStructureCache.clear();
    await tableForeignKeysCache.clear();
    await tablePrimaryKeysCache.clear();
    await tableReadPermissionCache.clear();
  }
}
