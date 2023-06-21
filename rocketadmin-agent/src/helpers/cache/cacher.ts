import { LRUCache } from 'lru-cache'
import { Constants } from '../constants/constants.js';

const knexCache = new LRUCache(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRUCache(Constants.DEFAULT_TUNNEL_CACHE_OPTIONS);
const driverCache = new LRUCache(Constants.DEFAULT_DRIVER_CACHE_OPTIONS);

export class Cacher {
  public static getCachedKnex(connectionConfig): any {
    const cachedKnex = knexCache.get(JSON.stringify(connectionConfig));
    return cachedKnex ? cachedKnex : null;
  }

  public static setKnexCache(connectionConfig, newKnex): void {
    knexCache.set(JSON.stringify(connectionConfig), newKnex);
  }

  public static getTunnelCache(connection): any {
    const cachedTnl = tunnelCache.get(JSON.stringify(connection));
    return cachedTnl ? cachedTnl : null;
  }

  public static setTunnelCache(connection, tnlObj): void {
    tunnelCache.set(JSON.stringify(connection), tnlObj);
  }

  public static delTunnelCache(connection): void {
    tunnelCache.delete(JSON.stringify(connection));
  }

  public static getDriverCache(connection): any {
    const cachedDriver = driverCache.get(JSON.stringify(connection));
    return cachedDriver ? cachedDriver : null;
  }

  public static setDriverCache(connection, newDriver): void {
    driverCache.set(JSON.stringify(connection), newDriver);
  }

  public static delDriverCache(connection): void {
    driverCache.delete(JSON.stringify(connection));
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
