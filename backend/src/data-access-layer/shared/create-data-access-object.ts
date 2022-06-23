import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { IDataAccessObject } from './data-access-object-interface';
import { ConnectionTypeEnum } from '../../enums';
import { DataAccessObjectPostgres } from '../data-access-objects/data-access-object-postgres';
import { DataAccessObjectMysql } from '../data-access-objects/data-access-object-mysql';
import { DataAccessObjectMysqlSsh } from '../data-access-objects/data-access-object-mysql-ssh';
import { DataAccessObjectOracle } from '../data-access-objects/data-access-object-oracle';
import { DataAccessObjectMssql } from '../data-access-objects/data-access-object-mssql';
import { DataAccessObjectAgent } from '../data-access-objects/data-access-object-agent';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus } from '@nestjs/common';
import { Messages } from '../../exceptions/text/messages';

export function createDataAccessObject(connection: ConnectionEntity, userId: string): IDataAccessObject {
  switch (connection.type) {
    case ConnectionTypeEnum.postgres:
      return new DataAccessObjectPostgres(connection);
    case ConnectionTypeEnum.mysql:
      if (connection.ssh) {
        return new DataAccessObjectMysqlSsh(connection);
      } else {
        return new DataAccessObjectMysql(connection);
      }
    case ConnectionTypeEnum.oracledb:
      return new DataAccessObjectOracle(connection);
    case ConnectionTypeEnum.mssql:
      return new DataAccessObjectMssql(connection);
    case ConnectionTypeEnum.agent_mssql:
    case ConnectionTypeEnum.agent_mysql:
    case ConnectionTypeEnum.agent_postgres:
    case ConnectionTypeEnum.agent_oracledb:
      return new DataAccessObjectAgent(connection, userId);
    default:
      throw new HttpException(
        {
          message: Messages.CONNECTION_TYPE_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
  }
}
