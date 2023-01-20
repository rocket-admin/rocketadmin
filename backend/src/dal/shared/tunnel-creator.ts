import getPort from 'get-port';
import { Cacher } from '../../helpers/cache/cacher.js';
import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { ConnectionTypeEnum } from '../../enums/index.js';
import { Constants } from '../../helpers/constants/constants.js';
import { isObjectEmpty } from '../../helpers/index.js';
import { getMssqlKnex } from '../../data-access-layer/shared/utils/get-mssql-knex.js';
import { getOracleKnex } from '../../data-access-layer/shared/utils/get-oracle-knex.js';
import { getPostgresKnex } from '../../data-access-layer/shared/utils/get-postgres-knex.js';
import tunnel from 'tunnel-ssh';

export class TunnelCreator {
  static async createTunneledKnex(connection: ConnectionEntity) {
    return new Promise<any>(async (resolve, reject) => {
      const cachedTnl = Cacher.getTunnelCache(connection);
      if (cachedTnl && !isObjectEmpty(cachedTnl) && cachedTnl.knex && cachedTnl.tnl) {
        resolve(cachedTnl.knex);
        return;
      }
      const freePort = await getPort();
      const sshConfig = TunnelCreator.getSshTunelConfig(connection, freePort);
      const tnl = await tunnel(sshConfig, async (err: any, server: any) => {
        if (err) {
          throw err;
        }
        connection.host = Constants.DEFAULT_FORWARD_IN_HOST;
        connection.port = freePort;

        const knex = this.configureKnex(connection);
        const tnlCachedObj = {
          tnl: tnl,
          knex: knex,
        };
        tnl.on('error', (e) => {
          Cacher.delTunnelCache(connection);
          reject(e);
          return;
        });
        Cacher.setTunnelCache(connection, tnlCachedObj);
        resolve(tnlCachedObj.knex);
        return;
      });
    }).catch((e) => {
      throw new Error(e);
    });
  }

  private static getSshTunelConfig(connection: ConnectionEntity, freePort: number) {
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

  private static configureKnex(connectionConfig: ConnectionEntity) {
    switch (connectionConfig.type) {
      case ConnectionTypeEnum.postgres:
        return getPostgresKnex(connectionConfig);

      case ConnectionTypeEnum.oracledb:
        return getOracleKnex(connectionConfig);

      case ConnectionTypeEnum.mssql:
        return getMssqlKnex(connectionConfig);
      default:
        break;
    }
  }
}
