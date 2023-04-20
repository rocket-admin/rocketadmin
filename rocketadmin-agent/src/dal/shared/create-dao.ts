import { IDaoInterface } from './dao-interface.js';
import { ICLIConnectionCredentials } from '../../interfaces/interfaces.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import { Messages } from '../../text/messages.js';
import { DaoMssql } from '../dao/dao-mssql.js';
import { DaoMysql } from '../dao/dao-mysql.js';
import { DaoOracledb } from '../dao/dao-oracledb.js';
import { DaoPostgres } from '../dao/dao-postgres.js';

export function createDao(connection: ICLIConnectionCredentials): IDaoInterface {
  switch (connection.type) {
    case 'postgres':
      return new DaoPostgres(connection);
    case 'mysql':
      return new DaoMysql(connection);
    case 'oracledb':
      return new DaoOracledb(connection);
    case 'mssql':
      return new DaoMssql(connection);
    default:
      console.log(Messages.CONNECTION_TYPE_UNSUPPORTED);
      throw new Error(Messages.CONNECTION_TYPE_UNSUPPORTED);
  }
}
