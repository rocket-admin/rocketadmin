import { ConnectionEntity } from '../entities/connection/connection.entity.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { ConnectionTypeTestEnum } from '../enums/connection-type.enum.js';
import { CreateConnectionDto } from '../entities/connection/application/dto/create-connection.dto.js';

export function isConnectionEntityAgent(connection: ConnectionEntity | CreateConnectionDto): boolean {
  switch (connection.type) {
    case ConnectionTypesEnum.agent_postgres:
      return true;
    case ConnectionTypesEnum.agent_mysql:
      return true;
    case ConnectionTypesEnum.agent_oracledb:
      return true;
    case ConnectionTypesEnum.agent_mssql:
      return true;
    case ConnectionTypesEnum.agent_ibmdb2:  
      return true;
    default:
      return false;
  }
}

export function isConnectionTypeAgent(type: ConnectionTypesEnum | string): boolean {
  switch (type) {
    case ConnectionTypeTestEnum.agent_postgres:
      return true;
    case ConnectionTypeTestEnum.agent_mysql:
      return true;
    case ConnectionTypeTestEnum.agent_oracledb:
      return true;
    case ConnectionTypeTestEnum.agent_mssql:
      return true;
    case ConnectionTypeTestEnum.agent_ibmdb2:
      return true;
    case ConnectionTypeTestEnum.cli_mssql:
      return true;
    case ConnectionTypeTestEnum.cli_mysql:
      return true;
    case ConnectionTypeTestEnum.cli_postgres:
      return true;
    case ConnectionTypeTestEnum.cli_oracledb:
      return true;
    case ConnectionTypeTestEnum.cli_ibmdb2:
      return true;
    default:
      return false;
  }
}
