import { AIToolDefinition } from '../../../ai-core/index.js';
import { SchemaChangeTypeEnum } from '../table-schema-change-enums.js';

export const PROPOSE_SCHEMA_CHANGE_TOOL_NAME = 'proposeSchemaChange';
export const GET_TABLE_STRUCTURE_TOOL_NAME = 'getTableStructure';

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
	const getTableStructureTool: AIToolDefinition = {
		name: GET_TABLE_STRUCTURE_TOOL_NAME,
		description:
			'Inspect an existing table. Returns column names, data types, nullability, primary keys, and foreign keys. Call this BEFORE proposing changes that reference an existing table.',
		parameters: {
			type: 'object',
			properties: {
				tableName: {
					type: 'string',
					description: 'The name of the table to inspect.',
				},
			},
			required: ['tableName'],
			additionalProperties: false,
		},
	};

	const proposeSchemaChangeTool: AIToolDefinition = {
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
					enum: Object.values(SchemaChangeTypeEnum),
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

	return [getTableStructureTool, proposeSchemaChangeTool];
}
