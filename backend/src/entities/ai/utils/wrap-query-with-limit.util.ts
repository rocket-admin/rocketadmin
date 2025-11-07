import { ConnectionTypesEnum } from "@rocketadmin/shared-code/src/data-access-layer/shared/enums/connection-types-enum.js";

export function wrapQueryWithLimit(query: string, databaseType: ConnectionTypesEnum): string {
  const queryWithoutSemicolon = query.replace(/;$/, '');
  switch (databaseType) {
    case ConnectionTypesEnum.postgres:
    case ConnectionTypesEnum.agent_postgres:
    case ConnectionTypesEnum.mysql:
    case ConnectionTypesEnum.agent_mysql:
    case ConnectionTypesEnum.mssql:
    case ConnectionTypesEnum.agent_mssql:
      return `SELECT * FROM (${queryWithoutSemicolon}) AS ai_query LIMIT 1000`;
    case ConnectionTypesEnum.ibmdb2:
    case ConnectionTypesEnum.agent_ibmdb2:
      return `SELECT * FROM (${queryWithoutSemicolon}) AS ai_query FETCH FIRST 1000 ROWS ONLY`;
    case ConnectionTypesEnum.oracledb:
    case ConnectionTypesEnum.agent_oracledb:
      return `SELECT * FROM (${queryWithoutSemicolon}) WHERE ROWNUM <= 1000`;
    default:
      throw new Error('Unsupported database type');
  }
}
