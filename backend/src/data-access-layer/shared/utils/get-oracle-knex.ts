import { ConnectionEntity } from '../../../entities/connection/connection.entity';
import { knex, Knex } from 'knex';
import { Cacher } from '../../../helpers/cache/cacher';

export function getOracleKnex(connection: ConnectionEntity): Knex {
  const { host, username, password, database, port, type, sid, ssl, cert } = connection;
  const cachedKnex = Cacher.getCachedKnex(connection);
  if (cachedKnex) {
    return cachedKnex;
  } else {
    const newKnex = knex({
      client: type,
      connection: {
        user: username,
        database: database,
        password: password,
        connectString: `${host}:${port}/${sid ? sid : ''}`,
        ssl: ssl ? { ca: cert ?? undefined, rejectUnauthorized: !cert } : false,
      },
    });
    Cacher.setKnexCache(connection, newKnex);
    return newKnex;
  }
}
