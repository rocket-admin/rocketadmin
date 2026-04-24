import { AIToolDefinition } from '../../../ai-core/index.js';
import { SchemaChangeTypeEnum } from '../table-schema-change-enums.js';

export const PROPOSE_SCHEMA_CHANGE_TOOL_NAME = 'proposeSchemaChange';
export const PROPOSE_MONGO_SCHEMA_CHANGE_TOOL_NAME = 'proposeMongoSchemaChange';
export const PROPOSE_DYNAMODB_SCHEMA_CHANGE_TOOL_NAME = 'proposeDynamoDbSchemaChange';
export const GET_TABLE_STRUCTURE_TOOL_NAME = 'getTableStructure';

export const TERMINAL_PROPOSAL_TOOL_NAMES: ReadonlySet<string> = new Set([
	PROPOSE_SCHEMA_CHANGE_TOOL_NAME,
	PROPOSE_MONGO_SCHEMA_CHANGE_TOOL_NAME,
	PROPOSE_DYNAMODB_SCHEMA_CHANGE_TOOL_NAME,
]);

export interface ProposeSchemaChangeArgs {
	forwardSql: string;
	rollbackSql: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	isReversible: boolean;
	summary: string;
	reasoning: string;
}

export function createSchemaChangeTools(): AIToolDefinition[] {
	return [createGetTableStructureTool(), createProposeSqlSchemaChangeTool()];
}

export function createMongoSchemaChangeTools(): AIToolDefinition[] {
	return [createGetTableStructureTool(), createProposeMongoSchemaChangeTool()];
}

export function createDynamoDbSchemaChangeTools(): AIToolDefinition[] {
	return [createGetTableStructureTool(), createProposeDynamoDbSchemaChangeTool()];
}

function createGetTableStructureTool(): AIToolDefinition {
	return {
		name: GET_TABLE_STRUCTURE_TOOL_NAME,
		description:
			'Inspect an existing table or MongoDB collection. For SQL databases returns column names, data types, nullability, primary keys, and foreign keys. For MongoDB returns inferred field types from sampled documents. Call this BEFORE proposing changes that reference an existing table/collection.',
		parameters: {
			type: 'object',
			properties: {
				tableName: {
					type: 'string',
					description: 'The name of the table or collection to inspect.',
				},
			},
			required: ['tableName'],
			additionalProperties: false,
		},
	};
}

function createProposeSqlSchemaChangeTool(): AIToolDefinition {
	return {
		name: PROPOSE_SCHEMA_CHANGE_TOOL_NAME,
		description:
			'Emit the final proposed DDL. Call this exactly ONCE when you are ready with forward SQL and its rollback. Do NOT use it for intermediate thinking. Both statements must be single DDL statements for the declared dialect.',
		parameters: {
			type: 'object',
			properties: {
				forwardSql: {
					type: 'string',
					description:
						'Single DDL statement to apply (e.g. CREATE TABLE "x" ...). No trailing semicolon required. Must be one statement.',
				},
				rollbackSql: {
					type: 'string',
					description:
						'Single DDL statement that undoes forwardSql (e.g. DROP TABLE "x" for a CREATE TABLE). Must be one statement. If truly non-reversible, still emit a best-effort compensating statement and set isReversible=false.',
				},
				changeType: {
					type: 'string',
					enum: Object.values(SchemaChangeTypeEnum).filter((v) => !v.startsWith('MONGO_')),
					description: 'Classification of the change. Match the AST of forwardSql.',
				},
				targetTableName: {
					type: 'string',
					description: 'The unqualified name of the table being created, altered, or dropped.',
				},
				isReversible: {
					type: 'boolean',
					description:
						'False when rolling back would lose data or cannot exactly restore state (e.g. DROP TABLE on populated table, DROP COLUMN). True otherwise.',
				},
				summary: {
					type: 'string',
					description: 'One-sentence human-readable description of the change.',
				},
				reasoning: {
					type: 'string',
					description: 'Brief explanation: what it does, why this rollback, any caveats.',
				},
			},
			required: ['forwardSql', 'rollbackSql', 'changeType', 'targetTableName', 'isReversible', 'summary', 'reasoning'],
			additionalProperties: false,
		},
	};
}

function createProposeDynamoDbSchemaChangeTool(): AIToolDefinition {
	return {
		name: PROPOSE_DYNAMODB_SCHEMA_CHANGE_TOOL_NAME,
		description:
			'Emit the final DynamoDB schema change. Call this exactly ONCE with forwardOp and rollbackOp as JSON strings. Each JSON string MUST decode to a single object describing one structured operation (createTable / deleteTable / updateTable / updateTimeToLive).',
		parameters: {
			type: 'object',
			properties: {
				forwardOp: {
					type: 'string',
					description:
						'JSON string describing the forward operation. Single object with "operation" and "tableName" fields plus op-specific fields (keySchema, attributeDefinitions, billingMode, provisionedThroughput, globalSecondaryIndexes, globalSecondaryIndexUpdates, timeToLiveSpecification, etc.).',
				},
				rollbackOp: {
					type: 'string',
					description:
						'JSON string describing the compensating operation. Must be a single object in the same form as forwardOp.',
				},
				changeType: {
					type: 'string',
					enum: Object.values(SchemaChangeTypeEnum).filter((v) => v.startsWith('DYNAMODB_')),
					description: 'Classification of the DynamoDB change.',
				},
				targetTableName: {
					type: 'string',
					description: 'The DynamoDB table name the change acts on.',
				},
				isReversible: {
					type: 'boolean',
					description:
						'False when rolling back cannot exactly restore state (e.g. deleteTable on a populated table). True otherwise.',
				},
				summary: {
					type: 'string',
					description: 'One-sentence human-readable description of the change.',
				},
				reasoning: {
					type: 'string',
					description: 'Brief explanation: what it does, why this rollback, any caveats.',
				},
			},
			required: ['forwardOp', 'rollbackOp', 'changeType', 'targetTableName', 'isReversible', 'summary', 'reasoning'],
			additionalProperties: false,
		},
	};
}

function createProposeMongoSchemaChangeTool(): AIToolDefinition {
	return {
		name: PROPOSE_MONGO_SCHEMA_CHANGE_TOOL_NAME,
		description:
			'Emit the final MongoDB schema change. Call this exactly ONCE with forwardOp and rollbackOp as JSON strings. Each JSON string MUST decode to a single object describing one structured operation (createCollection / dropCollection / setValidator / createIndex / dropIndex).',
		parameters: {
			type: 'object',
			properties: {
				forwardOp: {
					type: 'string',
					description:
						'JSON string describing the forward operation. Single object with "operation" and "collectionName" fields plus op-specific fields (indexSpec, indexName, validatorSchema, etc.).',
				},
				rollbackOp: {
					type: 'string',
					description:
						'JSON string describing the compensating operation. Must be a single object in the same form as forwardOp.',
				},
				changeType: {
					type: 'string',
					enum: Object.values(SchemaChangeTypeEnum).filter((v) => v.startsWith('MONGO_')),
					description: 'Classification of the Mongo change.',
				},
				targetTableName: {
					type: 'string',
					description: 'The unqualified collection name the change acts on.',
				},
				isReversible: {
					type: 'boolean',
					description:
						'False when rolling back cannot exactly restore state (e.g. dropCollection on a populated collection). True otherwise.',
				},
				summary: {
					type: 'string',
					description: 'One-sentence human-readable description of the change.',
				},
				reasoning: {
					type: 'string',
					description: 'Brief explanation: what it does, why this rollback, any caveats.',
				},
			},
			required: ['forwardOp', 'rollbackOp', 'changeType', 'targetTableName', 'isReversible', 'summary', 'reasoning'],
			additionalProperties: false,
		},
	};
}
