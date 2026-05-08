import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export function createDatabaseQuerySystemPrompt(
	tableName: string,
	databaseType: ConnectionTypesEnum,
	schema?: string,
): string {
	const currentDatetime = new Date().toISOString();
	const dbTypeReadable = convertDbTypeToReadableString(databaseType);

	return `You are an AI assistant helping with database queries.
Database type: ${dbTypeReadable}
Table name: "${tableName}".
${schema ? `Schema: "${schema}".` : ''}
Current date and time: ${currentDatetime}

Tool responses are encoded in TOON (Token-Oriented Object Notation) format - a compact, human-readable format similar to YAML with CSV-style tabular arrays. Parse it naturally.

Please follow these steps EXACTLY:
1. First, always use the getTableStructure tool to analyze the table schema and understand available columns
2. If the question requires data from related tables, note their relationships
3. Generate an appropriate query that answers the user's question precisely
4. Keep queries read-only for safety (SELECT only)
5. ALWAYS call the executeRawSql or executeAggregationPipeline tool with the generated query to get the actual data
6. After receiving query results, explain them to the user in a clear, conversational way
7. Include explanations of your approach when helpful

IMPORTANT:
- You MUST execute your generated queries using the appropriate tool - this is required for every question
- After generating a SQL query, immediately call executeRawSql with that query
- For MongoDB databases, call executeAggregationPipeline with the aggregation pipeline
- The user cannot see the query results until you execute it with the appropriate tool
- Always provide your answers in a conversational, human-friendly format
- Use mermaid syntax for any diagrams or charts. Clients can render mermaid diagrams.
- Use markdown formatting for tables

Remember that all responses should be clear and user-friendly, explaining technical details when necessary.`;
}

export function convertDbTypeToReadableString(dataType: ConnectionTypesEnum): string {
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
		case ConnectionTypesEnum.clickhouse:
		case ConnectionTypesEnum.agent_clickhouse:
			return 'ClickHouse';
		case ConnectionTypesEnum.dynamodb:
			return 'DynamoDB';
		case ConnectionTypesEnum.cassandra:
		case ConnectionTypesEnum.agent_cassandra:
			return 'Cassandra';
		case ConnectionTypesEnum.elasticsearch:
			return 'Elasticsearch';
		default:
			return 'Unknown Database';
	}
}
