import { ForbiddenException } from '@nestjs/common';
import { TableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import test from 'ava';
import {
	assertSomeColumnReadable,
	readableTableStructure,
	restrictTableSettingsToReadableColumns,
} from '../../../src/entities/table/utils/restrict-query-to-readable-columns.util.js';

// plan 13 P0-3: these helpers are what makes a column-level read permission bound the QUERY
// (filters, search, ordering, select) instead of only the response projection.

function structure(...columnNames: Array<string>): Array<TableStructureDS> {
	return columnNames.map((column_name) => ({ column_name }) as TableStructureDS);
}

test('assertSomeColumnReadable fails closed on an empty readable set', (t) => {
	// An empty set must never be read as "everything": excluding every column makes the MySQL/MSSQL
	// DAOs fall back to select('*'), and the caller would still get a real pagination.total to mine.
	t.throws(() => assertSomeColumnReadable(new Set<string>()), { instanceOf: ForbiddenException });
	t.notThrows(() => assertSomeColumnReadable(new Set(['id'])));
});

test('readableTableStructure drops withheld columns so filters/ordering cannot name them', (t) => {
	const reduced = readableTableStructure(structure('id', 'email', 'password'), new Set(['id', 'email']));
	t.deepEqual(
		reduced.map((column) => column.column_name),
		['id', 'email'],
	);
});

test('restrictTableSettingsToReadableColumns excludes withheld columns and intersects search fields', (t) => {
	const settings = {
		excluded_fields: ['internal_note'],
		search_fields: ['email', 'password'],
	} as TableSettingsDS;

	restrictTableSettingsToReadableColumns(settings, new Set(['id', 'email']), ['id', 'email', 'password']);

	// The withheld column joins the DAO's excluded set (bounds select() and the default search set)…
	t.deepEqual([...settings.excluded_fields].sort(), ['internal_note', 'password']);
	// …and an explicit search-field list can no longer name it.
	t.deepEqual(settings.search_fields, ['email']);
});

test('restrictTableSettingsToReadableColumns leaves settings untouched when everything is readable', (t) => {
	const settings = { excluded_fields: [], search_fields: ['email'] } as TableSettingsDS;

	restrictTableSettingsToReadableColumns(settings, new Set(['id', 'email']), ['id', 'email']);

	t.deepEqual(settings.excluded_fields, []);
	t.deepEqual(settings.search_fields, ['email']);
});

test('restrictTableSettingsToReadableColumns tolerates absent settings arrays', (t) => {
	const settings = {} as TableSettingsDS;

	restrictTableSettingsToReadableColumns(settings, new Set(['id']), ['id', 'password']);

	t.deepEqual(settings.excluded_fields, ['password']);
	t.is(settings.search_fields, undefined);
});
