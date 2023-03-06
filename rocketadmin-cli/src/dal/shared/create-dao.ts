import { IDaoInterface } from './dao-interface.js';
import { DaoPostgres } from '../dao/dao-postgres.js';
import { DaoMysql } from '../dao/dao-mysql.js';
import { DaoOracledb } from '../dao/dao-oracledb.js';
import { DaoMssql } from '../dao/dao-mssql.js';
import { ICLIConnectionCredentials } from '../../interfaces/interfaces.js';
import { Messages } from '../../text/messages.js';

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
