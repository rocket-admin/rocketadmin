import LRU from 'lru-cache';
import { Constants } from '../constants/constants.js';

const knexCache = new LRU(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);

export class Cacher {
  public static getCachedKnex(connectionConfig): any {
    const cachedKnex = knexCache.get(JSON.stringify(connectionConfig));
    return cachedKnex ? cachedKnex : null;
  }

  public static setKnexCache(connectionConfig, newKnex): void {
    knexCache.set(JSON.stringify(connectionConfig), newKnex);
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
