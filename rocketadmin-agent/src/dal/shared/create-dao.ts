import { IDaoInterface } from './dao-interface';
import { DaoPostgres } from '../dao/dao-postgres';
import { DaoMysql } from '../dao/dao-mysql';
import { DaoOracledb } from '../dao/dao-oracledb';
import { DaoMssql } from '../dao/dao-mssql';
import { ICLIConnectionCredentials } from '../../interfaces/interfaces';
import { Messages } from '../../text/messages';

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
