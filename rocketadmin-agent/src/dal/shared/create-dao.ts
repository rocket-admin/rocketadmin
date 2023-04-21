import { ICLIConnectionCredentials } from '../../interfaces/interfaces.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { Messages } from '../../text/messages.js';
import { DaoMssql } from '../dao/dao-mssql.js';
import { DaoMysql } from '../dao/dao-mysql.js';
import { DaoOracledb } from '../dao/dao-oracledb.js';
import { DaoPostgres } from '../dao/dao-postgres.js';

export function createDao(connection: ICLIConnectionCredentials): IDataAccessObject {
  return getDataAccessObject(connection) as unknown as IDataAccessObject;
}
