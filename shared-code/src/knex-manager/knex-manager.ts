import knex, { Knex } from 'knex';
import getPort from 'get-port';
import { ConnectionParams } from '../data-access-layer/shared/data-structures/connections-params.ds.js';
import { getTunnel } from '../helpers/get-ssh-tunnel.js';
import { LRUStorage } from '../caching/lru-storage.js';
export class KnexManager {
  static knexStorage() {
    const knexMap = new Map<ConnectionParams['type'], (connection: ConnectionParams) => Promise<Knex<any, any[]>>>();

    knexMap.set('postgres', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = LRUStorage.getCachedKnex(connection);
      if (cachedKnex) {
        try {
          await cachedKnex.raw('SELECT 1');
          return cachedKnex;
        } catch (_error) {
          LRUStorage.delKnexCache(connection);
        }
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        LRUStorage.setKnexCache(connection, newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getPostgresKnex(connection);
      LRUStorage.setKnexCache(connection, newKnex);
      return newKnex;
    });

    knexMap.set('mysql2', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = LRUStorage.getCachedKnex(connection);
      if (cachedKnex) {
        try {
          await cachedKnex.raw('SELECT 1');
          return cachedKnex;
        } catch (_error) {
          LRUStorage.delKnexCache(connection);
        }
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        LRUStorage.setKnexCache(connection, newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getMysqlKnex(connection);
      LRUStorage.setKnexCache(connection, newKnex);
      return newKnex;
    });

    knexMap.set('mssql', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = LRUStorage.getCachedKnex(connection);
      if (cachedKnex) {
        return cachedKnex;
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        LRUStorage.setKnexCache(connection, newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getMssqlKnex(connection);
      LRUStorage.setKnexCache(connection, newKnex);
      return newKnex;
    });

    knexMap.set('oracledb', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = LRUStorage.getCachedKnex(connection);
      if (cachedKnex) {
        return cachedKnex;
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        LRUStorage.setKnexCache(connection, newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getOracleKnex(connection);
      LRUStorage.setKnexCache(connection, newKnex);
      return newKnex;
    });

    return knexMap;
  }

  private static async createTunneledKnex(connection: ConnectionParams): Promise<Knex<any, any[]>> {
    const connectionCopy = { ...connection };
    return new Promise<Knex<any, any[]>>(async (resolve, reject): Promise<Knex<any, any[]>> => {
      const cachedTnl = LRUStorage.getTunnelCache(connectionCopy);
      if (cachedTnl && cachedTnl.knex && cachedTnl.server && cachedTnl.client) {
        resolve(cachedTnl.knex);
        return;
      }
      const freePort = await getPort();
      try {
        const [server, client] = await getTunnel(connectionCopy, freePort);
        connection.host = '127.0.0.1';
        connection.port = freePort;
        const knex = KnexManager.getKnex(connection);
        const tnlCachedObj = {
          server: server,
          client: client,
          knex: knex,
        };

        LRUStorage.setTunnelCache(connectionCopy, tnlCachedObj);

        resolve(tnlCachedObj.knex);

        client.on('error', (e) => {
          LRUStorage.delTunnelCache(connectionCopy);
          reject(e);
          return;
        });

        server.on('error', (e) => {
          LRUStorage.delTunnelCache(connectionCopy);
          reject(e);
          return;
        });
        return;
      } catch (error) {
        LRUStorage.delTunnelCache(connectionCopy);
        reject(error);
        return;
      }
    });
  }

  private static getPostgresKnex(connection: ConnectionParams): Knex<any, any[]> {
    const { host, username, password, database, port, type, cert, ssl } = connection;
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
      return newKnex;
    }

    if (host === process.env.POSTGRES_CONNECTION_HOST) {
      const newKnex = knex({
        client: type,
        connection: {
          host: host,
          user: username,
          password: password,
          database: database,
          port: port,
          application_name: 'rocketadmin',
          ssl: {
            rejectUnauthorized: false,
          },
        },
      });
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
        application_name: 'rocketadmin',
        ssl: ssl ? { ca: cert ?? undefined, rejectUnauthorized: !cert } : false,
      },
    });
    return newKnex;
  }

  private static getMysqlKnex(connection: ConnectionParams): Knex<any, any[]> {
    const { host, username, password, database, port, ssl, cert } = connection;
    const newKnex = knex({
      client: 'mysql2',
      connection: {
        host: host,
        user: username,
        password: password,
        database: database,
        port: port,
        ssl: ssl ? { ca: cert ?? undefined, rejectUnauthorized: !cert } : false,
      },
    });
    return newKnex;
  }

  private static getMssqlKnex(connection: ConnectionParams): Knex<any, any[]> {
    const { host, username, password, database, port, type, ssl, cert, azure_encryption } = connection;
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
    return newKnex;
  }

  private static getOracleKnex(connection: ConnectionParams): Knex<any, any[]> {
    const { host, username, password, database, port, type, sid, ssl, cert } = connection;
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
    return newKnex;
  }

  private static getKnex(connection: ConnectionParams): Knex<any, any[]> {
    const { type } = connection;
    switch (type) {
      case 'mysql' as any:
      case 'mysql2':
        return KnexManager.getMysqlKnex(connection);
      case 'postgres':
        return KnexManager.getPostgresKnex(connection);
      case 'oracledb':
        return KnexManager.getOracleKnex(connection);
      case 'mssql':
        return KnexManager.getMssqlKnex(connection);
    }
  }
}
