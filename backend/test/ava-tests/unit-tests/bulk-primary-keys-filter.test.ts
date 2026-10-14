import {
	applyPrimaryKeysFilter,
	BULK_PRIMARY_KEYS_LIMITS,
	chunkPrimaryKeyRows,
	normalisePrimaryKeys,
} from '@rocketadmin/shared-code/dist/src/helpers/bulk-primary-keys.js';
import { ERROR_MESSAGES } from '@rocketadmin/shared-code/dist/src/helpers/errors/error-messages.js';
import test from 'ava';
import knex from 'knex';

// Bulk row deletion (and the bulk "old rows" read that precedes it) used to filter with one
// `OR (col = ? AND …)` group per primary key, all in a single statement. The SQL DAOs now
// normalise the keys once, chunk them to each dialect's statement limits and filter with one
// IN list per chunk. These checks compile the filter with knex's own query compilers (no
// database) and pin the exact SQL each dialect gets.

const compile = (client: string) => knex({ client });

test('normalisePrimaryKeys keeps the column order of the first key and reorders the rest', (t) => {
	const { columns, rows } = normalisePrimaryKeys([
		{ a: 1, b: 'x' },
		{ b: 'y', a: 2 },
	]);
	t.deepEqual(columns, ['a', 'b']);
	t.deepEqual(rows, [
		[1, 'x'],
		[2, 'y'],
	]);
});

test('normalisePrimaryKeys returns nothing for no keys and refuses an empty key', (t) => {
	t.deepEqual(normalisePrimaryKeys([]), { columns: [], rows: [] });
	t.throws(() => normalisePrimaryKeys([{}]), { message: ERROR_MESSAGES.PRIMARY_KEY_EMPTY });
});

test('normalisePrimaryKeys refuses keys whose columns differ', (t) => {
	t.throws(() => normalisePrimaryKeys([{ a: 1 }, { a: 2, b: 3 }]), {
		message: ERROR_MESSAGES.PRIMARY_KEYS_COLUMNS_MISMATCH,
	});
	t.throws(() => normalisePrimaryKeys([{ a: 1 }, { b: 2 }]), {
		message: ERROR_MESSAGES.PRIMARY_KEYS_COLUMNS_MISMATCH,
	});
});

test('chunkPrimaryKeyRows splits by keys per statement and by bound values per statement', (t) => {
	const singleColumn = normalisePrimaryKeys(Array.from({ length: 2500 }, (_, i) => ({ id: i })));
	t.deepEqual(
		chunkPrimaryKeyRows(singleColumn, BULK_PRIMARY_KEYS_LIMITS.postgres).map((chunk) => chunk.length),
		[1000, 1000, 500],
	);

	const threeColumns = normalisePrimaryKeys(Array.from({ length: 700 }, (_, i) => ({ a: i, b: i, c: i })));
	// MSSQL: 2000 bindings / 3 columns = 666 keys per statement.
	t.deepEqual(
		chunkPrimaryKeyRows(threeColumns, BULK_PRIMARY_KEYS_LIMITS.mssql).map((chunk) => chunk.length),
		[666, 34],
	);

	const twoColumns = normalisePrimaryKeys(Array.from({ length: 1001 }, (_, i) => ({ a: i, b: i })));
	// Oracle: 1000 expressions per IN list / 2 columns = 500 keys per statement.
	t.deepEqual(
		chunkPrimaryKeyRows(twoColumns, BULK_PRIMARY_KEYS_LIMITS.oracle).map((chunk) => chunk.length),
		[500, 500, 1],
	);

	t.deepEqual(chunkPrimaryKeyRows({ columns: [], rows: [] }, BULK_PRIMARY_KEYS_LIMITS.postgres), []);
});

test('applyPrimaryKeysFilter compiles a single-column key to one IN list', (t) => {
	const { columns, rows } = normalisePrimaryKeys([{ id: 1 }, { id: 2 }, { id: 3 }]);
	const pg = applyPrimaryKeysFilter(compile('pg')('t').delete(), columns, rows, true).toSQL().toNative();
	t.is(pg.sql, 'delete from "t" where "id" in ($1, $2, $3)');
	t.deepEqual(pg.bindings, [1, 2, 3]);

	const mysql = applyPrimaryKeysFilter(compile('mysql2')('t').select('*'), columns, rows, true).toSQL().toNative();
	t.is(mysql.sql, 'select * from `t` where `id` in (?, ?, ?)');

	const mssql = applyPrimaryKeysFilter(compile('mssql')('t').select('*'), columns, rows, false).toSQL().toNative();
	t.is(mssql.sql, 'select * from [t] where [id] in (@p0, @p1, @p2)');
});

test('applyPrimaryKeysFilter compiles a composite key to a row-value IN list where supported', (t) => {
	const { columns, rows } = normalisePrimaryKeys([
		{ a: 1, b: 'x' },
		{ a: 2, b: 'y' },
	]);
	const pg = applyPrimaryKeysFilter(compile('pg')('t').delete(), columns, rows, true).toSQL().toNative();
	t.is(pg.sql, 'delete from "t" where ("a", "b") in (($1, $2), ($3, $4))');
	t.deepEqual(pg.bindings, [1, 'x', 2, 'y']);

	const oracle = applyPrimaryKeysFilter(compile('oracledb')('t').delete(), columns, rows, true).toSQL().toNative();
	t.is(oracle.sql, 'delete from "t" where ("a", "b") in ((:1, :2), (:3, :4))');
});

test('applyPrimaryKeysFilter falls back to a grouped OR of ANDs for composite keys without row values', (t) => {
	const { columns, rows } = normalisePrimaryKeys([
		{ a: 1, b: 'x' },
		{ a: 2, b: 'y' },
	]);
	const mssql = applyPrimaryKeysFilter(compile('mssql')('t').delete(), columns, rows, false).toSQL().toNative();
	t.is(mssql.sql, 'delete from [t] where (([a] = @p0 and [b] = @p1) or ([a] = @p2 and [b] = @p3));select @@rowcount');
	t.deepEqual(mssql.bindings, [1, 'x', 2, 'y']);
});

test('applyPrimaryKeysFilter keeps the key group isolated from other predicates', (t) => {
	const { columns, rows } = normalisePrimaryKeys([
		{ a: 1, b: 'x' },
		{ a: 2, b: 'y' },
	]);
	const sql = applyPrimaryKeysFilter(compile('pg')('t').select('*').where('deleted', false), columns, rows, false)
		.toSQL()
		.toNative().sql;
	t.is(sql, 'select * from "t" where "deleted" = $1 and (("a" = $2 and "b" = $3) or ("a" = $4 and "b" = $5))');
});

test('applyPrimaryKeysFilter matches a null key component with IS NULL instead of IN', (t) => {
	const single = normalisePrimaryKeys([{ id: 1 }, { id: null }]);
	const pgSingle = applyPrimaryKeysFilter(compile('pg')('t').delete(), single.columns, single.rows, true)
		.toSQL()
		.toNative();
	t.is(pgSingle.sql, 'delete from "t" where ("id" in ($1) or ("id" is null))');
	t.deepEqual(pgSingle.bindings, [1]);

	const onlyNull = normalisePrimaryKeys([{ id: null }]);
	t.is(
		applyPrimaryKeysFilter(compile('pg')('t').delete(), onlyNull.columns, onlyNull.rows, true).toSQL().toNative().sql,
		'delete from "t" where (("id" is null))',
	);

	const composite = normalisePrimaryKeys([
		{ a: 1, b: 'x' },
		{ a: 2, b: null },
	]);
	const pgComposite = applyPrimaryKeysFilter(compile('pg')('t').delete(), composite.columns, composite.rows, true)
		.toSQL()
		.toNative();
	t.is(pgComposite.sql, 'delete from "t" where (("a", "b") in (($1, $2)) or ("a" = $3 and "b" is null))');
	t.deepEqual(pgComposite.bindings, [1, 'x', 2]);

	const mssql = applyPrimaryKeysFilter(compile('mssql')('t').delete(), composite.columns, composite.rows, false)
		.toSQL()
		.toNative();
	t.is(mssql.sql, 'delete from [t] where (([a] = @p0 and [b] = @p1) or ([a] = @p2 and [b] is null));select @@rowcount');
});
