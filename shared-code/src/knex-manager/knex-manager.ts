import knex, { Knex } from 'knex';
import LRU from 'lru-cache';
import tunnel from 'tunnel-ssh';
import getPort from 'get-port';
import { ConnectionParams } from '../data-access-layer/shared/data-structures/connections-params.ds.js';
import { CACHING_CONSTANTS } from '../caching/caching-constants.js';

const knexCache = new LRU(CACHING_CONSTANTS.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRU(CACHING_CONSTANTS.DEFAULT_TUNNEL_CACHE_OPTIONS);

export class KnexManager {
  static knexStorage() {
    const knexMap = new Map<ConnectionParams['type'], (connection: ConnectionParams) => Promise<Knex<any, any[]>>>();

    knexMap.set('postgres', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = knexCache.get(JSON.stringify(connection));
      if (cachedKnex) {
        return cachedKnex;
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        knexCache.set(JSON.stringify(connection), newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getPostgresKnex(connection);
      knexCache.set(JSON.stringify(connection), newKnex);
      return newKnex;
    });

    knexMap.set('mysql2', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = knexCache.get(JSON.stringify(connection));
      if (cachedKnex) {
        return cachedKnex;
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        knexCache.set(JSON.stringify(connection), newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getMysqlKnex(connection);
      knexCache.set(JSON.stringify(connection), newKnex);
      return newKnex;
    });

    knexMap.set('mssql', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = knexCache.get(JSON.stringify(connection));
      if (cachedKnex) {
        return cachedKnex;
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        knexCache.set(JSON.stringify(connection), newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getMssqlKnex(connection);
      knexCache.set(JSON.stringify(connection), newKnex);
      return newKnex;
    });

    knexMap.set('oracledb', async (connection: ConnectionParams): Promise<Knex<any, any[]>> => {
      const cachedKnex = knexCache.get(JSON.stringify(connection));
      if (cachedKnex) {
        return cachedKnex;
      }
      if (connection.ssh) {
        const newKnex = await KnexManager.createTunneledKnex(connection);
        knexCache.set(JSON.stringify(connection), newKnex);
        return newKnex;
      }
      const newKnex = KnexManager.getOracleKnex(connection);
      knexCache.set(JSON.stringify(connection), newKnex);
      return newKnex;
    });

    return knexMap;
  }

  private static async createTunneledKnex(connection: ConnectionParams): Promise<Knex<any, any[]>> {
    return new Promise<Knex<any, any[]>>(async (resolve, reject): Promise<Knex<any, any[]>> => {
      const cachedTnl = tunnelCache.get(JSON.stringify(connection));
      if (cachedTnl && cachedTnl.knex && cachedTnl.tnl) {
        resolve(cachedTnl.knex);
        return;
      }
      const freePort = await getPort();
      const sshConfig = KnexManager.getSshTunelConfig(connection, freePort);
      const tnl = await tunnel(sshConfig, async (err: any, server: any) => {
        if (err) {
          throw err;
        }
        connection.host = '127.0.0.1';
        connection.port = freePort;

        const knex = KnexManager.getKnex(connection);
        const tnlCachedObj = {
          tnl: tnl,
          knex: knex,
        };
        tnl.on('error', (e) => {
          tunnelCache.delete(JSON.stringify(connection));
          reject(e);
          return;
        });
        tunnelCache.set(JSON.stringify(connection), tnlCachedObj);
        resolve(tnlCachedObj.knex);
        return;
      });
    }).catch((e) => {
      throw new Error(e);
    });
  }

  private static getSshTunelConfig(connection: ConnectionParams, freePort: number) {
    const { host, port, privateSSHKey, sshPort, sshHost, sshUsername } = connection;
    return {
      host: sshHost,
      port: sshPort,
      username: sshUsername,
      privateKey: privateSSHKey,
      keepAlive: true,
      dstHost: host,
      dstPort: port,
      localHost: 'localhost',
      localPort: freePort,
    };
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
