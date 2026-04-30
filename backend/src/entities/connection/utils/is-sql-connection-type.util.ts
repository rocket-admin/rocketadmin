import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

const SQL_CONNECTION_TYPES: ReadonlySet<string> = new Set<string>([
	ConnectionTypesEnum.postgres,
	ConnectionTypesEnum.mysql,
	ConnectionTypesEnum.mysql2,
	ConnectionTypesEnum.oracledb,
	ConnectionTypesEnum.mssql,
	ConnectionTypesEnum.ibmdb2,
	ConnectionTypesEnum.clickhouse,
	ConnectionTypesEnum.agent_postgres,
	ConnectionTypesEnum.agent_mysql,
	ConnectionTypesEnum.agent_oracledb,
	ConnectionTypesEnum.agent_mssql,
	ConnectionTypesEnum.agent_ibmdb2,
	ConnectionTypesEnum.agent_clickhouse,
]);

export function isSqlConnectionType(type: ConnectionTypesEnum | string): boolean {
	return SQL_CONNECTION_TYPES.has(type);
}
