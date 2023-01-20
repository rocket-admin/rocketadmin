import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import knex from 'knex';
import { Knex } from 'knex';
import { Cacher } from '../../../helpers/cache/cacher.js';

export function getPostgresKnex(connection: ConnectionEntity): Knex {
  const { host, username, password, database, port, type, cert, ssl } = connection;
  const cachedKnex = Cacher.getCachedKnex(connection);
  if (cachedKnex) {
    return cachedKnex;
  } else {
    if (process.env.NODE_ENV === 'test') {
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
      Cacher.setKnexCache(connection, newKnex);
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
        application_name: 'autoadmin',
        ssl: ssl ? { ca: cert ?? undefined, rejectUnauthorized: !cert } : false,
      },
    });
    Cacher.setKnexCache(connection, newKnex);
    return newKnex;
  }
}
