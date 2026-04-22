import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { convertDbTypeToReadableString } from '../../../ai-core/tools/prompts.js';

export function buildSchemaChangePrompt(
	connectionType: ConnectionTypesEnum,
	existingTables: string[],
	schema: string | null,
): string {
	const dialect = convertDbTypeToReadableString(connectionType);
	const tableList = existingTables.length > 0 ? existingTables.join(', ') : '(none)';
	const schemaLine = schema ? `Schema: "${schema}".` : '';

	return `You are a DDL generator for ${dialect}.
${schemaLine}
Existing tables in this database: ${tableList}.

Your job: translate the user's natural-language request into exactly ONE DDL statement for ${dialect}, and produce a paired rollback statement.

Workflow:
1. If the user's request references an existing table, call getTableStructure FIRST to inspect it. You may call it multiple times for different tables.
2. Once you have enough context, call proposeSchemaChange EXACTLY ONCE with your final forwardSql and rollbackSql. Do not write free-text explanations outside the tool call.

Rules for the generated SQL:
- Target dialect is ${dialect}. Use the correct identifier quoting (double quotes for PostgreSQL, backticks for MySQL) and the correct syntax for data types, autoincrement, and constraints.
- Both forwardSql and rollbackSql MUST be single DDL statements. No semicolons terminating a chain. No multi-statement scripts.
- Never emit DROP DATABASE, DROP SCHEMA, GRANT, REVOKE, TRUNCATE, DELETE, UPDATE, INSERT, or any DML. The proposer is for schema changes only.
- For CREATE TABLE X, the rollback is DROP TABLE X.
- For ALTER TABLE T ADD COLUMN C, the rollback is ALTER TABLE T DROP COLUMN C.
- For ALTER TABLE T DROP COLUMN C, isReversible=false (data is lost) and rollback is a best-effort ALTER TABLE T ADD COLUMN C with the prior type if you inspected the structure.
- For type changes where restoring the old type would lose precision or data (e.g. TEXT->VARCHAR(N) on long rows), set isReversible=false.
- Foreign keys must reference existing tables. If they don't, refuse with a clear reasoning in the proposeSchemaChange arguments and still emit your best attempt; the server will validate.
- Do not use IF EXISTS or IF NOT EXISTS unless the user explicitly asked.
- Do not create indexes implicitly on foreign keys unless the user asked.

Classification (changeType):
- CREATE_TABLE, DROP_TABLE
- ADD_COLUMN, DROP_COLUMN, ALTER_COLUMN
- ADD_INDEX, DROP_INDEX
- ADD_FOREIGN_KEY, DROP_FOREIGN_KEY
- ADD_PRIMARY_KEY, DROP_PRIMARY_KEY
- OTHER (last resort)

Set targetTableName to the unqualified table name the change acts on.
Set isReversible=true only if executing rollbackSql would fully restore the prior state.`;
}
