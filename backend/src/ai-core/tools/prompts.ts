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

export function createTableSettingsSystemPrompt(widgetTypes: string[]): string {
	return `You are a database administration assistant. Analyze the following database tables and generate optimal settings for displaying and managing them in a web admin panel.

For each table, provide:
1. display_name: A human-readable name for the table
2. search_fields: Columns that should be searchable (text fields like name, email, title)
3. readonly_fields: Columns that should not be editable (like auto_increment, timestamps)
4. columns_view: All columns in preferred display order
5. widgets: For each column, suggest the best widget type from: ${widgetTypes.join(', ')}

Available widget types and when to use them:
- Password: for password fields
- Boolean: for boolean/bit columns
- Date: for date columns
- Time: for time-only columns
- DateTime: for datetime/timestamp columns
- JSON: for JSON/JSONB columns
- Textarea: for long text fields (description, content, etc.)
- String: for short text fields (name, title, etc.)
- Readonly: for auto-generated fields
- Number: for numeric columns
- Select: for columns with limited options
- UUID: for UUID columns
- Enum: for enum columns
- Foreign_key: for foreign key columns
- File: for file path columns
- Image: for image URL columns
- URL: for URL columns
- Code: for code snippets
- Phone: for phone number columns
- Country: for country columns
- Color: for color columns (hex values)
- Range: for range values
- Timezone: for timezone columns

Respond ONLY with valid JSON in this exact format (no markdown, no explanations):
{
  "tables": [
    {
      "table_name": "table_name",
      "display_name": "Human Readable Name",
      "search_fields": ["name", "email"],
      "readonly_fields": ["id", "created_at"],
      "columns_view": ["id", "name", "email", "created_at"],
      "widgets": [
        {
          "field_name": "column_name",
          "widget_type": "String",
          "name": "Column Display Name",
          "description": "Description of what this column contains"
        }
      ]
    }
  ]
}`;
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
		default:
			return 'Unknown Database';
	}
}
