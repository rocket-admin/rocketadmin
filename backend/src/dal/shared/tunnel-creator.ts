import getPort from 'get-port';
import { Cacher } from '../../helpers/cache/cacher';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { ConnectionTypeEnum } from '../../enums';
import { Constants } from '../../helpers/constants/constants';
import { isObjectEmpty } from '../../helpers';
import { getMssqlKnex } from '../../data-access-layer/shared/utils/get-mssql-knex';
import { getOracleKnex } from '../../data-access-layer/shared/utils/get-oracle-knex';
import { getPostgresKnex } from '../../data-access-layer/shared/utils/get-postgres-knex';
import * as tunnel from 'tunnel-ssh';

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
