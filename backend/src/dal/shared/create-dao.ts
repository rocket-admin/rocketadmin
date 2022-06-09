import { ConnectionTypeEnum } from '../../enums';
import { DaoAgent } from '../dao-agent/dao-agent';
import { DaoMssql } from '../dao/dao-mssql';
import { DaoMysql } from '../dao/dao-mysql';
import { DaoOracledb } from '../dao/dao-oracledb';
import { DaoSshMysql } from '../dao-ssh/dao-ssh-mysql';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus } from '@nestjs/common';
import { IDaoInterface } from './dao-interface';
import { DataAccessObjectPostgres } from '../../data-access-layer/shared/data-access-object-postgres';

export function createDao(connection, cognitoUserName: string): IDaoInterface {
  switch (connection.type) {
    case ConnectionTypeEnum.postgres:
      return new DataAccessObjectPostgres(connection) as any;

    case ConnectionTypeEnum.mysql:
      if (connection.ssh) {
        return new DaoSshMysql(connection);
      } else {
        return new DaoMysql(connection);
      }

    case ConnectionTypeEnum.oracledb:
      return new DaoOracledb(connection);

    case ConnectionTypeEnum.mssql:
      return new DaoMssql(connection);

    case ConnectionTypeEnum.agent_postgres:
    case ConnectionTypeEnum.agent_mssql:
    case ConnectionTypeEnum.agent_mysql:
    case ConnectionTypeEnum.agent_oracledb:
      return new DaoAgent(connection, cognitoUserName);
    default:
      throw new HttpException(
        {
          message: 'Connection to this type of database has not been implemented yet',
        },
        HttpStatus.BAD_REQUEST,
      );
  }
}
