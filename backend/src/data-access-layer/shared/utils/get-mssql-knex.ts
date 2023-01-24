import knex from 'knex';
import { Knex } from 'knex';
import { Cacher } from '../../../helpers/cache/cacher.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';

export function getMssqlKnex(connection: ConnectionEntity): Knex {
  const { host, username, password, database, port, type, ssl, cert, azure_encryption } = connection;
  const cachedKnex = Cacher.getCachedKnex(connection);
  if (cachedKnex) {
    return cachedKnex;
  } else {
    const newKnex = knex({
      client: type,
      connection: {
        host: host,
        user: username,
        password: password,
        database: database,
        port: port,
        ssl: ssl ? { ca: cert ?? undefined, rejectUnauthorized: !cert } : false,
        options: azure_encryption
          ? {
              encrypt: azure_encryption,
            }
          : undefined,
      },
    });
    Cacher.setKnexCache(connection, newKnex);
    return newKnex;
  }
}
