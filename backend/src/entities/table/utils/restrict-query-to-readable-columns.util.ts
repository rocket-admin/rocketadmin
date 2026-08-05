import { ForbiddenException } from '@nestjs/common';
import { TableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';

// Column-level read permissions must bound the QUERY, not just the response (plan 13 P0-3).
//
// Stripping non-readable columns from the returned rows leaves the withheld values reachable
// indirectly: a filter or search on a hidden column still runs in SQL, and `pagination.total`
// (matched-row count) then answers "does this column start with X?" one character at a time —
// enough to extract a password hash from a table the caller may legitimately query. Ordering by a
// hidden column leaks the same way through the row order across pages.
//
// These helpers make the readable set the INPUT to filtering, search, ordering and the select list:
//
//   1. `readableTableStructure` — parse filters and the ordering field against this instead of the
//      full structure, so a filter naming a withheld column is ignored exactly like one naming a
//      column that does not exist (no existence oracle, and dropping a filter only ever widens the
//      result set, never narrows it to something the caller could not already see).
//   2. `restrictTableSettingsToReadableColumns` — adds every withheld column to `excluded_fields`
//      (which `findAvailableFields` honours in every DAO, so it bounds the `select()` list and the
//      default search-field set) and intersects an explicit `search_fields` list with the readable
//      set.
//   3. `assertSomeColumnReadable` — fails CLOSED on an empty readable set. Without it, excluding
//      every column makes the MySQL/MSSQL DAOs fall back to `select('*')`, and the caller still
//      gets a real `pagination.total` to run the oracle against.
//
// The post-query projection (`filterRowsByReadableColumns`) stays in place on top of this as
// defense in depth. `universal-backend` enforces the same rule for the generated-site runtime
// (`resolvePublicReadableColumns`, plan 13 Step 0) — keep the two in step.

// No readable column at all ⇒ 403, for authenticated and public callers alike. A caller who may
// query a table but read none of its columns can still mine it through filters, so an empty
// projection is not a safe answer.
export function assertSomeColumnReadable(readableColumns: Set<string>): void {
	if (readableColumns.size === 0) {
		throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
	}
}

// The table structure reduced to the readable columns — the parsing input for filters/ordering.
export function readableTableStructure(
	tableStructure: Array<TableStructureDS>,
	readableColumns: Set<string>,
): Array<TableStructureDS> {
	return tableStructure.filter((column) => readableColumns.has(column.column_name));
}

// Bounds the DAO's own column handling (select list, default and explicit search fields) to the
// readable set. Mutates the settings object the caller is about to hand to the DAO.
export function restrictTableSettingsToReadableColumns(
	settings: TableSettingsDS,
	readableColumns: Set<string>,
	allColumnNames: Array<string>,
): void {
	const withheld = allColumnNames.filter((columnName) => !readableColumns.has(columnName));
	if (withheld.length === 0) {
		return;
	}
	settings.excluded_fields = [...new Set([...(settings.excluded_fields ?? []), ...withheld])];
	// An explicit search-field list may name withheld columns; intersect it. Emptying it is safe —
	// the DAOs then fall back to the available (now readable-only) fields.
	if (settings.search_fields && settings.search_fields.length > 0) {
		settings.search_fields = settings.search_fields.filter((field) => readableColumns.has(field));
	}
}
