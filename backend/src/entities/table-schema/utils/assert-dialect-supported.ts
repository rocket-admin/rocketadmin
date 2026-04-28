import { BadRequestException } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

const SUPPORTED_DIALECTS: ReadonlySet<ConnectionTypesEnum> = new Set([
	ConnectionTypesEnum.postgres,
	ConnectionTypesEnum.mysql,
	ConnectionTypesEnum.mysql2,
	ConnectionTypesEnum.mssql,
	ConnectionTypesEnum.oracledb,
	ConnectionTypesEnum.ibmdb2,
	ConnectionTypesEnum.mongodb,
	ConnectionTypesEnum.clickhouse,
	ConnectionTypesEnum.agent_clickhouse,
	ConnectionTypesEnum.dynamodb,
	ConnectionTypesEnum.cassandra,
	ConnectionTypesEnum.agent_cassandra,
	ConnectionTypesEnum.elasticsearch,
]);

export function isDialectSupported(connectionType: ConnectionTypesEnum): boolean {
	return SUPPORTED_DIALECTS.has(connectionType);
}

export function assertDialectSupported(connectionType: ConnectionTypesEnum): void {
	if (!isDialectSupported(connectionType)) {
		throw new BadRequestException(
			`Schema changes via AI are not yet supported for "${connectionType}". Supported: PostgreSQL, MySQL, Microsoft SQL Server, Oracle DB, IBM DB2, MongoDB, ClickHouse, DynamoDB, Cassandra, Elasticsearch.`,
		);
	}
}

export function isMongoDialect(connectionType: ConnectionTypesEnum): boolean {
	return connectionType === ConnectionTypesEnum.mongodb || connectionType === ConnectionTypesEnum.agent_mongodb;
}

export function isClickHouseDialect(connectionType: ConnectionTypesEnum): boolean {
	return connectionType === ConnectionTypesEnum.clickhouse || connectionType === ConnectionTypesEnum.agent_clickhouse;
}

export function isDynamoDbDialect(connectionType: ConnectionTypesEnum): boolean {
	return connectionType === ConnectionTypesEnum.dynamodb;
}

export function isCassandraDialect(connectionType: ConnectionTypesEnum): boolean {
	return connectionType === ConnectionTypesEnum.cassandra || connectionType === ConnectionTypesEnum.agent_cassandra;
}

export function isElasticsearchDialect(connectionType: ConnectionTypesEnum): boolean {
	return connectionType === ConnectionTypesEnum.elasticsearch;
}

const SQL_PARSER_DIALECTS: Record<string, string> = {
	[ConnectionTypesEnum.postgres]: 'PostgresQL',
	[ConnectionTypesEnum.agent_postgres]: 'PostgresQL',
	[ConnectionTypesEnum.mysql]: 'MySQL',
	[ConnectionTypesEnum.mysql2]: 'MySQL',
	[ConnectionTypesEnum.agent_mysql]: 'MySQL',
	[ConnectionTypesEnum.mssql]: 'TransactSQL',
	[ConnectionTypesEnum.agent_mssql]: 'TransactSQL',
	[ConnectionTypesEnum.ibmdb2]: 'DB2',
	[ConnectionTypesEnum.agent_ibmdb2]: 'DB2',
};

export function connectionTypeToParserDialect(connectionType: ConnectionTypesEnum): string {
	return SQL_PARSER_DIALECTS[connectionType] ?? 'PostgresQL';
}
