import * as LRU from 'lru-cache';
import { Constants } from '../constants/constants';
import { Knex } from 'knex';
import { ConnectionEntity } from '../../entities/connection/connection.entity';

const knexCache = new LRU(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRU(Constants.DEFAULT_TUNNEL_CACHE_OPTIONS);
const driverCache = new LRU(Constants.DEFAULT_DRIVER_CACHE_OPTIONS);
// const tableSettingsCache = new LRU(Constants.DEFAULT_SETTINGS_CACHE_OPTIONS);
const usersEmailsCache = new LRU(Constants.DEFAULT_USER_EMAILS_CACHE_OPTIONS);
const invitationCache = new LRU(Constants.DEFAULT_INVITATION_CACHE_OPTIONS);

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

  public static getCachedKnex(connectionConfig): any {
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
