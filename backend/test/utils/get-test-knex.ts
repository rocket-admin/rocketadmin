import { knex, Knex } from 'knex';
import * as LRU from 'lru-cache';
import { ConnectionTypeEnum } from '../../src/enums';
import { Constants } from '../../src/helpers/constants/constants';

const knexCache = new LRU(Constants.DEFAULT_CONNECTION_CACHE_OPTIONS);

export function getTestKnex(connectionParams): Knex {
  const cachedKnex = knexCache.get(JSON.stringify(connectionParams)) as Knex;
  if (cachedKnex) {
    return cachedKnex;
  }
  const { host, username, password, database, port, type, sid, cert, ssl } = connectionParams;
  if (type === ConnectionTypeEnum.oracledb) {
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
