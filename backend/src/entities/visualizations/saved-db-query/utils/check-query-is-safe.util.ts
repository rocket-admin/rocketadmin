import { BadRequestException } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

const FORBIDDEN_SQL_KEYWORDS = [
	'INSERT',
	'UPDATE',
	'DELETE',
	'MERGE',
	'UPSERT',
	'REPLACE',
	'CREATE',
	'ALTER',
	'DROP',
	'TRUNCATE',
	'RENAME',
	'GRANT',
	'REVOKE',
	'COMMIT',
	'ROLLBACK',
	'SAVEPOINT',
	'VACUUM',
	'ANALYZE',
	'REINDEX',
	'CLUSTER',
	'EXECUTE',
	'EXEC',
	'CALL',
	'DO',
	'COPY',
	'LOAD',
	'IMPORT',
	'LOCK',
	'UNLOCK',
];

const FORBIDDEN_MONGODB_OPERATIONS = [
	'$merge',
	'$out',
	'insertOne',
	'insertMany',
	'updateOne',
	'updateMany',
	'deleteOne',
	'deleteMany',
	'replaceOne',
	'findOneAndDelete',
	'findOneAndReplace',
	'findOneAndUpdate',
	'bulkWrite',
	'drop',
	'createIndex',
	'dropIndex',
	'createCollection',
	'renameCollection',
];

const FORBIDDEN_ELASTICSEARCH_OPERATIONS = [
	'_delete',
	'_update',
	'_bulk',
	'_create',
	'_doc',
	'_index',
	'_reindex',
	'_delete_by_query',
	'_update_by_query',
];

const FORBIDDEN_REDIS_COMMANDS = [
	'SET',
	'DEL',
	'HSET',
	'HDEL',
	'LPUSH',
	'RPUSH',
	'LPOP',
	'RPOP',
	'SADD',
	'SREM',
	'ZADD',
	'ZREM',
	'FLUSHDB',
	'FLUSHALL',
	'RENAME',
	'EXPIRE',
	'PERSIST',
	'MOVE',
	'COPY',
	'RESTORE',
	'MIGRATE',
	'DUMP',
];

const SQL_CONNECTION_TYPES: ConnectionTypesEnum[] = [
	ConnectionTypesEnum.postgres,
	ConnectionTypesEnum.agent_postgres,
	ConnectionTypesEnum.mysql,
	ConnectionTypesEnum.agent_mysql,
	ConnectionTypesEnum.mssql,
	ConnectionTypesEnum.agent_mssql,
	ConnectionTypesEnum.oracledb,
	ConnectionTypesEnum.agent_oracledb,
	ConnectionTypesEnum.ibmdb2,
	ConnectionTypesEnum.agent_ibmdb2,
	ConnectionTypesEnum.clickhouse,
	ConnectionTypesEnum.agent_clickhouse,
	ConnectionTypesEnum.cassandra,
	ConnectionTypesEnum.agent_cassandra,
];

const MONGODB_CONNECTION_TYPES: ConnectionTypesEnum[] = [
	ConnectionTypesEnum.mongodb,
	ConnectionTypesEnum.agent_mongodb,
];

const ELASTICSEARCH_CONNECTION_TYPES: ConnectionTypesEnum[] = [ConnectionTypesEnum.elasticsearch];

const REDIS_CONNECTION_TYPES: ConnectionTypesEnum[] = [ConnectionTypesEnum.redis, ConnectionTypesEnum.agent_redis];

const DYNAMODB_CONNECTION_TYPES: ConnectionTypesEnum[] = [ConnectionTypesEnum.dynamodb];

export interface QuerySafetyResult {
	isSafe: boolean;
	reason?: string;
	forbiddenKeyword?: string;
}

export function checkSqlQueryIsSafe(query: string): QuerySafetyResult {
	if (!query || typeof query !== 'string') {
		return { isSafe: false, reason: 'Query is empty or invalid' };
	}

	const normalizedQuery = normalizeQuery(query);

	for (const keyword of FORBIDDEN_SQL_KEYWORDS) {
		const regex = new RegExp(`\\b${keyword}\\b`, 'i');
		if (regex.test(normalizedQuery)) {
			return {
				isSafe: false,
				reason: `Query contains forbidden keyword: ${keyword}`,
				forbiddenKeyword: keyword,
			};
		}
	}

	const trimmedQuery = normalizedQuery.trim().toUpperCase();
	const allowedPrefixes = ['SELECT', 'WITH', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN'];
	const startsWithAllowed = allowedPrefixes.some((prefix) => trimmedQuery.startsWith(prefix));

	if (!startsWithAllowed) {
		return {
			isSafe: false,
			reason: 'Query must start with SELECT, WITH, SHOW, DESCRIBE, or EXPLAIN',
		};
	}

	return { isSafe: true };
}

export function checkMongoQueryIsSafe(query: string): QuerySafetyResult {
	if (!query || typeof query !== 'string') {
		return { isSafe: false, reason: 'Query is empty or invalid' };
	}

	const normalizedQuery = query.toLowerCase();

	for (const operation of FORBIDDEN_MONGODB_OPERATIONS) {
		if (normalizedQuery.includes(operation.toLowerCase())) {
			return {
				isSafe: false,
				reason: `Query contains forbidden MongoDB operation: ${operation}`,
				forbiddenKeyword: operation,
			};
		}
	}

	return { isSafe: true };
}

export function checkElasticsearchQueryIsSafe(query: string): QuerySafetyResult {
	if (!query || typeof query !== 'string') {
		return { isSafe: false, reason: 'Query is empty or invalid' };
	}

	const normalizedQuery = query.toLowerCase();

	for (const operation of FORBIDDEN_ELASTICSEARCH_OPERATIONS) {
		if (normalizedQuery.includes(operation.toLowerCase())) {
			return {
				isSafe: false,
				reason: `Query contains forbidden Elasticsearch operation: ${operation}`,
				forbiddenKeyword: operation,
			};
		}
	}

	return { isSafe: true };
}

export function checkRedisQueryIsSafe(query: string): QuerySafetyResult {
	if (!query || typeof query !== 'string') {
		return { isSafe: false, reason: 'Query is empty or invalid' };
	}

	const normalizedQuery = query.toUpperCase().trim();

	for (const command of FORBIDDEN_REDIS_COMMANDS) {
		const regex = new RegExp(`\\b${command}\\b`, 'i');
		if (regex.test(normalizedQuery)) {
			return {
				isSafe: false,
				reason: `Query contains forbidden Redis command: ${command}`,
				forbiddenKeyword: command,
			};
		}
	}

	return { isSafe: true };
}

export function checkDynamoDbQueryIsSafe(query: string): QuerySafetyResult {
	return checkSqlQueryIsSafe(query);
}

export function validateQuerySafety(query: string, connectionType: ConnectionTypesEnum): void {
	let result: QuerySafetyResult;

	if (MONGODB_CONNECTION_TYPES.includes(connectionType)) {
		result = checkMongoQueryIsSafe(query);
	} else if (ELASTICSEARCH_CONNECTION_TYPES.includes(connectionType)) {
		result = checkElasticsearchQueryIsSafe(query);
	} else if (REDIS_CONNECTION_TYPES.includes(connectionType)) {
		result = checkRedisQueryIsSafe(query);
	} else if (DYNAMODB_CONNECTION_TYPES.includes(connectionType)) {
		result = checkDynamoDbQueryIsSafe(query);
	} else if (SQL_CONNECTION_TYPES.includes(connectionType)) {
		result = checkSqlQueryIsSafe(query);
	} else {
		result = checkSqlQueryIsSafe(query);
	}

	if (!result.isSafe) {
		throw new BadRequestException(`Unsafe query: ${result.reason}. Only read-only queries are allowed.`);
	}
}
function normalizeQuery(query: string): string {
	return query
		.replace(/--.*$/gm, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
