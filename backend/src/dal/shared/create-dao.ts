import { ConnectionTypeEnum } from '../../enums';
import { DaoAgent } from '../dao-agent/dao-agent';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus } from '@nestjs/common';
import { IDaoInterface } from './dao-interface';
import { DataAccessObjectPostgres } from '../../data-access-layer/data-access-objects/data-access-object-postgres';
import { DataAccessObjectMysql } from '../../data-access-layer/data-access-objects/data-access-object-mysql';
import { DataAccessObjectMysqlSsh } from '../../data-access-layer/data-access-objects/data-access-object-mysql-ssh';
import { DataAccessObjectOracle } from '../../data-access-layer/data-access-objects/data-access-object-oracle';
import { DataAccessObjectMssql } from '../../data-access-layer/data-access-objects/data-access-object-mssql';

export function createDao(connection, cognitoUserName: string): IDaoInterface {
  switch (connection.type) {
    case ConnectionTypeEnum.postgres:
      return new DataAccessObjectPostgres(connection) as any;

    case ConnectionTypeEnum.mysql:
      if (connection.ssh) {
        return new DataAccessObjectMysqlSsh(connection) as any;
      } else {
        return new DataAccessObjectMysql(connection) as any;
      }

    case ConnectionTypeEnum.oracledb:
      return new DataAccessObjectOracle(connection) as any;

    case ConnectionTypeEnum.mssql:
      return new DataAccessObjectMssql(connection) as any;

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
