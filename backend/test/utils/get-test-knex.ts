import knex from 'knex';
import { Knex } from 'knex';
import { LRUCache } from 'lru-cache';
import { Constants } from '../../src/helpers/constants/constants.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

const knexCache = new LRUCache(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);

export function getTestKnex(connectionParams): Knex {
  const cachedKnex = knexCache.get(JSON.stringify(connectionParams)) as Knex;
  if (cachedKnex) {
    return cachedKnex;
  }
  const { host, username, password, database, port, type, sid, cert, ssl } = connectionParams;
  if (type === ConnectionTypesEnum.oracledb) {
    const newKnex = knex({
      client: type,
      connection: {
        user: username,
        database: database,
        password: password,
        connectString: `${host}:${port}/${sid ? sid : ''}`,
        ssl: ssl ? { ca: cert } : { rejectUnauthorized: false },
      },
    });
    knexCache.set(JSON.stringify(connectionParams), newKnex);
    return newKnex;
  }

  const newKnex = knex({
    client: type,
    connection: {
      host: host,
      user: username,
      password: password,
      database: database,
      port: port,
    },
  });
  knexCache.set(JSON.stringify(connectionParams), newKnex);
  return newKnex;
}

export async function clearAllTestKnex() {
  const elements = [];
  knexCache.forEach((value, key) => {
    elements.push({ key, value });
  });
  for (const element of elements) {
    await element.value.destroy();
    knexCache.delete(element.key);
  }
  knexCache.clear();
}
