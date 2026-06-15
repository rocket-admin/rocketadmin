// Helpers to enforce column-level read permissions (the `column:read` Cedar action) by
// stripping non-readable columns from query results and table metadata after a read.
// The set of readable column names is produced by CedarPermissionsService.getReadableColumns.

export function isAllColumnsReadable(readable: Set<string>, allColumnNames: Array<string>): boolean {
	return allColumnNames.every((columnName) => readable.has(columnName));
}

export function filterRowByReadableColumns(
	row: Record<string, unknown>,
	readable: Set<string>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(row)) {
		if (readable.has(key)) {
			result[key] = row[key];
		}
	}
	return result;
}

export function filterRowsByReadableColumns(
	rows: Array<Record<string, unknown>>,
	readable: Set<string>,
): Array<Record<string, unknown>> {
	return rows.map((row) => filterRowByReadableColumns(row, readable));
}

export function filterStructureByReadableColumns<T extends { column_name: string }>(
	structure: Array<T>,
	readable: Set<string>,
): Array<T> {
	return structure.filter((column) => readable.has(column.column_name));
}

export function filterColumnNamesByReadable(
	columnNames: Array<string> | undefined,
	readable: Set<string>,
): Array<string> | undefined {
	if (!columnNames) return columnNames;
	return columnNames.filter((columnName) => readable.has(columnName));
}
