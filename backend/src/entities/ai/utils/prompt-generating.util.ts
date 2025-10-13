import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';

export function convertDdTypeEnumToReadableString(dataType: ConnectionTypesEnum): string {
  switch (dataType) {
    case ConnectionTypesEnum.postgres:
    case ConnectionTypesEnum.agent_postgres:
      return 'PostgreSQL';
    case ConnectionTypesEnum.mysql:
    case ConnectionTypesEnum.agent_mysql:
      return 'MySQL';
    case ConnectionTypesEnum.mongodb:
    case ConnectionTypesEnum.agent_mongodb:
      return 'MongoDB';
    case ConnectionTypesEnum.mssql:
    case ConnectionTypesEnum.agent_mssql:
      return 'Microsoft SQL Server';
    case ConnectionTypesEnum.oracledb:
    case ConnectionTypesEnum.agent_oracledb:
      return 'Oracle DB';
    case ConnectionTypesEnum.ibmdb2:
    case ConnectionTypesEnum.agent_ibmdb2:
      return 'IBM DB2';
    default:
      throw new Error('Unknown database type');
  }
}
