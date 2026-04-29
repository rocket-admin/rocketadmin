import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import {
	isDynamoDbSchemaChangeType,
	isElasticsearchSchemaChangeType,
	isMongoSchemaChangeType,
	SchemaChangeTypeEnum,
} from '../table-schema-change-enums.js';
import {
	isCassandraDialect,
	isClickHouseDialect,
	isDynamoDbDialect,
	isElasticsearchDialect,
} from './assert-dialect-supported.js';
import { executeCassandraDdl } from './cassandra-ddl.js';
import { executeClickHouseDdl } from './clickhouse-ddl.js';
import { executeDynamoDbSchemaOp, validateProposedDynamoDbOp } from './dynamodb-schema-op.js';
import { executeElasticsearchSchemaOp, validateProposedElasticsearchOp } from './elasticsearch-schema-op.js';
import { executeMongoSchemaOp, validateProposedMongoOp } from './mongo-schema-op.js';

export interface ExecuteSchemaChangeOptions {
	connection: ConnectionEntity;
	connectionType: ConnectionTypesEnum;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	sql: string;
	allowAnyOperation?: boolean;
}

export async function executeSchemaChange(opts: ExecuteSchemaChangeOptions): Promise<void> {
	const { connection, connectionType, changeType, targetTableName, sql, allowAnyOperation } = opts;

	if (isMongoSchemaChangeType(changeType)) {
		const op = validateProposedMongoOp({
			opJson: sql,
			changeType,
			targetTableName,
			allowAnyOperation,
		});
		await executeMongoSchemaOp(connection, op);
		return;
	}

	if (isDynamoDbSchemaChangeType(changeType) || isDynamoDbDialect(connectionType)) {
		const op = validateProposedDynamoDbOp({
			opJson: sql,
			changeType,
			targetTableName,
			allowAnyOperation,
		});
		await executeDynamoDbSchemaOp(connection, op);
		return;
	}

	if (isElasticsearchSchemaChangeType(changeType) || isElasticsearchDialect(connectionType)) {
		const op = validateProposedElasticsearchOp({
			opJson: sql,
			changeType,
			targetTableName,
			allowAnyOperation,
		});
		await executeElasticsearchSchemaOp(connection, op);
		return;
	}

	if (isClickHouseDialect(connectionType)) {
		await executeClickHouseDdl(connection, sql);
		return;
	}

	if (isCassandraDialect(connectionType)) {
		await executeCassandraDdl(connection, sql);
		return;
	}

	const dao = getDataAccessObject(connection);
	await dao.executeRawQuery(sql, targetTableName, null);
}
