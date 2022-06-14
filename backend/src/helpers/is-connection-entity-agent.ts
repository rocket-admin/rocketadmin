import { ConnectionEntity } from '../entities/connection/connection.entity';
import { ConnectionTypeEnum } from '../enums';
import { CreateConnectionDto } from '../entities/connection/dto';

export function isConnectionEntityAgent(connection: ConnectionEntity | CreateConnectionDto): boolean {
  switch (connection.type) {
    case ConnectionTypeEnum.agent_postgres:
      return true;
    case ConnectionTypeEnum.agent_mysql:
      return true;
    case ConnectionTypeEnum.agent_oracledb:
      return true;
    case ConnectionTypeEnum.agent_mssql:
      return true;
    default:
      return false;
  }
}

export function isConnectionTypeAgent(type: ConnectionTypeEnum | string): boolean {
  switch (type) {
    case ConnectionTypeEnum.agent_postgres:
      return true;
    case ConnectionTypeEnum.agent_mysql:
      return true;
    case ConnectionTypeEnum.agent_oracledb:
      return true;
    case ConnectionTypeEnum.agent_mssql:
      return true;
    default:
      return false;
  }
}
