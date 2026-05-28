import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import test from 'ava';
import { collectQueryTables } from '../../../src/entities/visualizations/panel/utils/collect-query-tables.util.js';

function tablesOf(query: string, type = ConnectionTypesEnum.postgres): Array<string> {
	const result = collectQueryTables(query, type);
	if (result.kind !== 'tables') {
		throw new Error(`expected resolved tables, got indeterminate: ${result.reason}`);
	}
	return [...result.tables].sort();
}

test('resolves a single table from a simple SELECT', (t) => {
	t.deepEqual(tablesOf('SELECT id, name FROM users'), ['users']);
});

test('resolves all tables referenced in a JOIN', (t) => {
	t.deepEqual(tablesOf('SELECT * FROM users u JOIN orders o ON u.id = o.user_id'), ['orders', 'users']);
});

test('resolves tables hidden inside a subquery', (t) => {
	t.deepEqual(tablesOf('SELECT * FROM users WHERE id IN (SELECT user_id FROM secret_payouts)'), [
		'secret_payouts',
		'users',
	]);
});

test('resolves tables across a UNION', (t) => {
	t.deepEqual(tablesOf('SELECT id FROM a UNION SELECT id FROM b'), ['a', 'b']);
});

test('excludes CTE aliases but keeps their underlying tables', (t) => {
	t.deepEqual(tablesOf('WITH cte AS (SELECT * FROM orders) SELECT * FROM cte JOIN users ON true'), ['orders', 'users']);
});

test('strips the schema qualifier and keeps the bare table name', (t) => {
	t.deepEqual(tablesOf('SELECT * FROM analytics.events'), ['events']);
});

test('treats a query with no concrete table as indeterminate', (t) => {
	const result = collectQueryTables('SELECT 1', ConnectionTypesEnum.postgres);
	t.is(result.kind, 'indeterminate');
});

test('treats DESCRIBE as indeterminate (target table not resolvable)', (t) => {
	const result = collectQueryTables('DESCRIBE users', ConnectionTypesEnum.mysql);
	t.is(result.kind, 'indeterminate');
});

test('treats unparseable SQL as indeterminate', (t) => {
	const result = collectQueryTables('EXPLAIN SELECT * FROM users', ConnectionTypesEnum.postgres);
	t.is(result.kind, 'indeterminate');
});

test('treats non-SQL connection types as indeterminate without parsing', (t) => {
	const result = collectQueryTables('db.users.find({})', ConnectionTypesEnum.mongodb);
	t.is(result.kind, 'indeterminate');
	if (result.kind === 'indeterminate') {
		t.true(result.reason.includes('non-SQL'));
	}
});

test('resolves tables from a multi-statement query', (t) => {
	t.deepEqual(tablesOf('SELECT * FROM a; SELECT * FROM b'), ['a', 'b']);
});
