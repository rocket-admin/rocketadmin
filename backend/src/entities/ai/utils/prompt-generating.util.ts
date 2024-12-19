import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';

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

export function generateSqlQueryPrompt(
  tableName: string,
  foundConnection: ConnectionEntity,
): string {
  return `You are an AI assistant. The user has a question about a database table.
Database type: ${convertDdTypeEnumToReadableString(foundConnection.type as ConnectionTypesEnum)}.
Table name: "${tableName}".
${foundConnection.schema ? `Schema: "${foundConnection.schema}".` : ''}
Answer question about users data.
Use the information about table structures, referenced tables, and foreign keys that was uploaded as a file to this thread.`;
}

export function generateMongoDbCommandPrompt(
  tableName: string,
  foundConnection: ConnectionEntity,
): string {
  return `You are an AI assistant. The user has a question about a database table.
Database type: ${convertDdTypeEnumToReadableString(foundConnection.type as ConnectionTypesEnum)}.
Table name: "${tableName}".
${foundConnection.schema ? `Schema: "${foundConnection.schema}".` : ''}
Answer question about users data.
Use the information about table structures, referenced tables, and foreign keys that was uploaded as a file to this thread.`;
}
