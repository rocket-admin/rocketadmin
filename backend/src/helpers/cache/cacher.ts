import { LRUCache } from 'lru-cache';
import { isSaaS } from '../app/is-saas.js';
import { Constants } from '../constants/constants.js';

const invitationCache = new LRUCache(Constants.DEFAULT_INVITATION_CACHE_OPTIONS);
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

  public static async clearAllCache(): Promise<void> {
    await invitationCache.clear();
    await tableReadPermissionCache.clear();
  }
}
