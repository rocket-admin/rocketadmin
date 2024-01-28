import { ConnectionEntity } from '../entities/connection/connection.entity.js';
import { ConnectionTypeEnum } from '../enums/index.js';
import { ConnectionTypeTestEnum } from '../enums/connection-type.enum.js';
import { CreateConnectionDto } from '../entities/connection/application/dto/create-connection.dto.js';

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
      case ConnectionTypeTestEnum.agent_postgres:
        return true;
      case ConnectionTypeTestEnum.agent_mysql:
        return true;
      case ConnectionTypeTestEnum.agent_oracledb:
        return true;
      case ConnectionTypeTestEnum.agent_mssql:
        return true;
      case ConnectionTypeTestEnum.cli_mssql:
        return true;
      case ConnectionTypeTestEnum.cli_mysql:
        return true;
      case ConnectionTypeTestEnum.cli_postgres:
        return true;
      case ConnectionTypeTestEnum.cli_oracledb:
        return true;
      default:
        return false;
    }
  
  // switch (type) {
  //   case ConnectionTypeEnum.agent_postgres:
  //     return true;
  //   case ConnectionTypeEnum.agent_mysql:
  //     return true;
  //   case ConnectionTypeEnum.agent_oracledb:
  //     return true;
  //   case ConnectionTypeEnum.agent_mssql:
  //     return true;
  //   default:
  //     return false;
  // }
}
