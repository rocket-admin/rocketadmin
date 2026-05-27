import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import sqlParser from 'node-sql-parser';
import { connectionTypeToParserDialect } from '../../../table-schema/utils/assert-dialect-supported.js';

const { Parser } = sqlParser;

// Connection types that node-sql-parser cannot analyze. Their queries are not SQL, so we never
// attempt to parse them and instead let the caller fall back to the all-tables permission check.
const NON_SQL_CONNECTION_TYPES: ReadonlySet<ConnectionTypesEnum> = new Set([
	ConnectionTypesEnum.mongodb,
	ConnectionTypesEnum.agent_mongodb,
	ConnectionTypesEnum.elasticsearch,
	ConnectionTypesEnum.redis,
	ConnectionTypesEnum.agent_redis,
	ConnectionTypesEnum.dynamodb,
]);

export type CollectQueryTablesResult =
	| { kind: 'tables'; tables: Array<string> }
	| { kind: 'indeterminate'; reason: string };

/**
 * Extracts the real tables a read-only query references, so the caller can verify the user has
 * read permission on each of them.
 *
 * Returns `{ kind: 'tables' }` only when a confident, non-empty list of concrete tables could be
 * resolved. In every other case — non-SQL connections, parse failures, or statements that resolve
 * to no concrete table (e.g. `SELECT 1`, `SHOW`, `DESCRIBE`) — it returns `{ kind: 'indeterminate' }`
 * and the caller must fall back to a stricter check rather than assume the query is harmless.
 */
export function collectQueryTables(query: string, connectionType: ConnectionTypesEnum): CollectQueryTablesResult {
	if (NON_SQL_CONNECTION_TYPES.has(connectionType)) {
		return { kind: 'indeterminate', reason: `non-SQL connection type "${connectionType}"` };
	}

	const dialect = connectionTypeToParserDialect(connectionType);
	const parser = new Parser();

	let rawTableList: Array<string>;
	let cteNames: Set<string>;
	try {
		rawTableList = parser.tableList(query, { database: dialect });
		cteNames = collectCteNames(parser, query, dialect);
	} catch (error) {
		return { kind: 'indeterminate', reason: `parse error: ${(error as Error).message}` };
	}

	const tables = new Set<string>();
	for (const entry of rawTableList) {
		// node-sql-parser returns entries formatted as "{type}::{db}::{table}". We ignore the schema
		// ("db") segment since permissions are keyed on bare table names.
		const tableName = entry.split('::').pop();
		if (!tableName || tableName === 'null') {
			continue;
		}
		// Common Table Expressions are aliases for inline subqueries, not real tables; the subqueries'
		// underlying tables are already present in the list, so the CTE names must be dropped.
		if (cteNames.has(tableName.toLowerCase())) {
			continue;
		}
		tables.add(tableName);
	}

	if (tables.size === 0) {
		return { kind: 'indeterminate', reason: 'query resolved to no concrete table' };
	}

	return { kind: 'tables', tables: Array.from(tables) };
}

function collectCteNames(parser: InstanceType<typeof Parser>, query: string, dialect: string): Set<string> {
	const names = new Set<string>();
	const ast = parser.astify(query, { database: dialect });
	const statements = Array.isArray(ast) ? ast : [ast];
	for (const statement of statements) {
		const withClause = (statement as { with?: unknown })?.with;
		if (!Array.isArray(withClause)) {
			continue;
		}
		for (const cte of withClause) {
			const name = extractCteName((cte as { name?: unknown })?.name);
			if (name) {
				names.add(name.toLowerCase());
			}
		}
	}
	return names;
}

function extractCteName(nameNode: unknown): string | null {
	if (typeof nameNode === 'string') {
		return nameNode;
	}
	if (nameNode && typeof nameNode === 'object') {
		const value = (nameNode as { value?: unknown }).value;
		if (typeof value === 'string') {
			return value;
		}
	}
	return null;
}
