import * as LRU from 'lru-cache';
import { Constants } from '../constants/constants';
import { Knex } from 'knex';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { IForeignKey, IPrimaryKey, ITableStructure } from '../../data-access-layer/shared/data-access-object-interface';

const knexCache = new LRU(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRU(Constants.DEFAULT_TUNNEL_CACHE_OPTIONS);
const driverCache = new LRU(Constants.DEFAULT_DRIVER_CACHE_OPTIONS);
// const tableSettingsCache = new LRU(Constants.DEFAULT_SETTINGS_CACHE_OPTIONS);
const usersEmailsCache = new LRU(Constants.DEFAULT_USER_EMAILS_CACHE_OPTIONS);
const invitationCache = new LRU(Constants.DEFAULT_INVITATION_CACHE_OPTIONS);
const tableStructureCache = new LRU(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tableForeignKeysCache = new LRU(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tablePrimaryKeysCache = new LRU(Constants.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);

export class Cacher {
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
    const cachedCount = invitationCache.get(userId);
    return cachedCount ? cachedCount : 0;
  }

  public static getGroupInvitationCachedCount(groupId: string): number {
    const cachedCount = invitationCache.get(groupId);
    return cachedCount ? cachedCount : 0;
  }

  public static canInvite(userId: string, groupId: string): boolean {
    const userInvitations = Cacher.getUserInvitationCachedCount(userId);
    const groupInvitations = Cacher.getGroupInvitationCachedCount(groupId);
    return userInvitations <= 10 && groupInvitations <= 10;
  }

  public static getCachedKnex(connectionConfig): Knex {
    const cachedKnex = knexCache.get(JSON.stringify(connectionConfig));
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

  public static delTunnelCache(connection: ConnectionEntity, tnlObj): void {
    tunnelCache.del(JSON.stringify(connection), tnlObj);
  }

  public static getDriverCache(connection: ConnectionEntity): any {
    const cachedDriver = driverCache.get(JSON.stringify(connection));
    return cachedDriver ? cachedDriver : null;
  }

  public static setDriverCache(connection: ConnectionEntity, newDriver): void {
    driverCache.set(JSON.stringify(connection), newDriver);
  }

  public static delDriverCache(connection: ConnectionEntity): void {
    driverCache.del(JSON.stringify(connection));
  }

  public static setEmailCache(userId: string, email: string) {
    usersEmailsCache.set(userId, email);
  }

  public static getEmailFromCache(userId: string) {
    const userEmail = usersEmailsCache.get(userId);
    return userEmail ? userEmail : null;
  }

  public static clearEmailsCache() {
    usersEmailsCache.forEach(async (item) => {
      await item.destroy();
    });
    return true;
  }

  public static setTableStructureCache(
    connection: ConnectionEntity,
    tableName: string,
    structure: Array<ITableStructure>,
  ): void {
    const cacheObj = JSON.stringify({ connection, tableName });
    tableStructureCache.set(cacheObj, structure);
  }

  public static getTableStructureCache(connection: ConnectionEntity, tableName: string): Array<ITableStructure> {
    const cacheObj = JSON.stringify({ connection, tableName });
    const foundStructure = tableStructureCache.get(cacheObj);
    return foundStructure ? foundStructure : null;
  }

  public static clearTableStructureCache(): void {
    tableStructureCache.forEach(async (item) => {
      await item.destroy();
    });
  }

  public static setTablePrimaryKeysCache(
    connection: ConnectionEntity,
    tableName: string,
    primaryKeys: Array<IPrimaryKey>,
  ): void {
    const cacheObj = JSON.stringify({ connection, tableName });
    tablePrimaryKeysCache.set(cacheObj, primaryKeys);
  }

  public static getTablePrimaryKeysCache(connection: ConnectionEntity, tableName: string): Array<IPrimaryKey> {
    const cacheObj = JSON.stringify({ connection, tableName });
    const foundKeys = tablePrimaryKeysCache.get(cacheObj);
    return foundKeys ? foundKeys : null;
  }

  public static clearTablePrimaryKeysCache(): void {
    tablePrimaryKeysCache.forEach(async (item) => {
      await item.destroy();
    });
  }

  public static setTableForeignKeysCache(
    connection: ConnectionEntity,
    tableName: string,
    foreignKeys: Array<IForeignKey>,
  ): void {
    const cacheObj = JSON.stringify({ connection, tableName });
    tableForeignKeysCache.set(cacheObj, foreignKeys);
  }

  public static getTableForeignKeysCache(connection: ConnectionEntity, tableName: string): Array<IForeignKey> {
    const cacheObj = JSON.stringify({ connection, tableName });
    const foundKeys = tableForeignKeysCache.get(cacheObj);
    return foundKeys ? foundKeys : null;
  }

  public static clearTableForeignKeysCache(): void {
    tableForeignKeysCache.forEach(async (item) => {
      await item.destroy();
    });
  }

  public static async clearKnexCache() {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Method clearKnexCache only for testing!');
      throw new Error('This method only for testing!');
    }

    knexCache.forEach(async (item) => {
      await item.destroy();
    });

    return true;
  }
}
