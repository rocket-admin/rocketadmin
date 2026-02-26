import { AIToolDefinition } from '../interfaces/ai-provider.interface.js';

export function createDatabaseTools(isMongoDB: boolean): AIToolDefinition[] {
	const getTableStructureTool: AIToolDefinition = {
		name: 'getTableStructure',
		description:
			'Returns the structure of the specified table and related information including foreign keys and referenced tables.',
		parameters: {
			type: 'object',
			properties: {
				tableName: {
					type: 'string',
					description: 'The name of the table to get the structure for.',
				},
			},
			required: ['tableName'],
			additionalProperties: false,
		},
	};

	const executeRawSqlTool: AIToolDefinition = {
		name: 'executeRawSql',
		description:
			'Executes a raw SQL query and returns the results. Only SELECT queries are allowed. Do not drop the database or any data from the database.',
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description:
						'The SQL query to execute. Table and column names should be properly escaped. Only SELECT statements are allowed.',
				},
			},
			required: ['query'],
			additionalProperties: false,
		},
	};

	const executeAggregationPipelineTool: AIToolDefinition = {
		name: 'executeAggregationPipeline',
		description:
			'Executes a MongoDB aggregation pipeline and returns the results. Do not drop the database or any data from the database.',
		parameters: {
			type: 'object',
			properties: {
				pipeline: {
					type: 'string',
					description: 'The MongoDB aggregation pipeline to execute as a JSON string.',
				},
			},
			required: ['pipeline'],
			additionalProperties: false,
		},
	};

	const tools: AIToolDefinition[] = [getTableStructureTool];

	if (isMongoDB) {
		tools.push(executeAggregationPipelineTool);
	} else {
		tools.push(executeRawSqlTool);
	}

	return tools;
}

export function createDashboardGenerationTools(): AIToolDefinition[] {
	return [
		{
			name: 'getTablesList',
			description:
				'Returns the list of all tables and views available in the database. Use this to discover what tables exist before requesting their structure.',
			parameters: {
				type: 'object',
				properties: {},
				required: [],
				additionalProperties: false,
			},
		},
		{
			name: 'getTableStructure',
			description:
				'Returns the structure of the specified table including column names, data types, and nullability. Use this to inspect tables before generating dashboard panels.',
			parameters: {
				type: 'object',
				properties: {
					tableName: {
						type: 'string',
						description: 'The name of the table to get the structure for.',
					},
				},
				required: ['tableName'],
				additionalProperties: false,
			},
		},
	];
}

export function createTableAnalysisTools(): AIToolDefinition[] {
	return [
		{
			name: 'analyzeTableSchema',
			description: 'Analyzes a table schema and returns recommendations for display settings and widgets.',
			parameters: {
				type: 'object',
				properties: {
					tableName: {
						type: 'string',
						description: 'The name of the table to analyze.',
					},
					columns: {
						type: 'array',
						description: 'Array of column definitions with name, type, and constraints.',
					},
				},
				required: ['tableName', 'columns'],
				additionalProperties: false,
			},
		},
	];
}
