// The logic of db-table-row-view (DbTableRowViewComponent), the row preview side panel: its field
// list, the foreign-key values and links, the "copy link to this record" URL, and the "Related
// records" — the rows of other tables that reference the open row, fetched one table at a time.
import JsonURL from '@jsonurl/jsonurl';
import { type Ref, reactive, ref, watch } from 'vue';
import { formatFieldValue } from '@/lib/format-field-value';
import { normalizeFieldName, normalizeTableName } from '@/lib/normalize';
import type { TableField, TableForeignKey, TableRow, Widget } from '@/models/table';
import { type TableRowsResponse, useTablesStore } from '@/stores/tables';

export interface RowViewColumn {
	title: string;
	normalizedTitle: string;
}

export interface ReferencedTable {
	table_name: string;
	column_name: string;
	display_name?: string;
	displayTableName: string;
}

export interface ReferencedRecords {
	rows: Record<string, unknown>[];
	/** Entry-page query params of each row: its primary key plus `mode: 'view'`. */
	links: Record<string, unknown>[];
	identityColumn: { isSet: boolean; fieldName: string; displayName: string };
	fieldsOrder: { fieldName: string; displayName: string }[];
}

interface ReferencedRowsResponse extends TableRowsResponse {
	identity_column?: string | null;
	list_fields: string[];
}

/** The panel's fields: the table's column order (or the record's keys), widget names first. */
export function rowViewColumns(row: TableRow): RowViewColumn[] {
	if (!row.columnsOrder || !row.record) return [];
	const order = row.columnsOrder.length ? row.columnsOrder : Object.keys(row.record);
	return order.map((column) => ({
		title: column,
		normalizedTitle: row.widgets?.[column]?.name || normalizeFieldName(column),
	}));
}

/** The text of a foreign-key field: its identity column, else the referenced key, else the value. */
export function getForeignKeyValue(row: TableRow | null, field: string): unknown {
	const cell = row?.record?.[field];
	if (cell == null) return null;
	if (typeof cell === 'object') {
		const referencedColumnName = row?.foreignKeys?.[field]?.referenced_column_name;
		const object = cell as Record<string, unknown>;
		const identityColumnName = Object.keys(object).find((key) => key !== referencedColumnName);
		if (identityColumnName) return object[identityColumnName];
		if (referencedColumnName && object[referencedColumnName] != null) return object[referencedColumnName];
		return null;
	}
	return cell;
}

/** `{ [referenced column]: value }` of a foreign-key field, `{}` when it is empty. */
export function getForeignKeyQueryParams(row: TableRow | null, field: string): Record<string, unknown> {
	const cell = row?.record?.[field];
	const referencedColumnName = row?.foreignKeys?.[field]?.referenced_column_name;
	if (cell == null || !referencedColumnName) return {};
	return {
		[referencedColumnName]: typeof cell === 'object' ? (cell as Record<string, unknown>)[referencedColumnName] : cell,
	};
}

/** The open row's primary key as entry-page query params (foreign keys by referenced value). */
export function getDedicatedPageLinkParams(row: TableRow | null): Record<string, unknown> {
	if (!row) return {};
	const params: Record<string, unknown> = {};
	for (const key of Object.keys(row.primaryKeys ?? {})) {
		if (row.foreignKeysList?.includes(key)) {
			const referencedColumnName = row.foreignKeys?.[key]?.referenced_column_name ?? '';
			params[key] = (row.record?.[key] as Record<string, unknown> | undefined)?.[referencedColumnName];
		} else {
			params[key] = row.primaryKeys?.[key];
		}
	}
	return params;
}

/** The absolute URL of the open row's entry page, for "Copy link to this record". */
export function getDedicatedPageLink(row: TableRow | null, origin: string = location.origin): string {
	if (!row) return '';
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(getDedicatedPageLinkParams(row))) params.set(key, String(value));
	return `${origin}${row.link}?${params.toString()}`;
}

/** The tables referencing the open row, with display names. */
export function referencedTables(row: TableRow): ReferencedTable[] {
	return (row.relatedRecords?.referenced_by ?? []).map((table) => ({
		...table,
		displayTableName: table.display_name || normalizeTableName(table.table_name),
	}));
}

/** The `{ [column]: { eq: value } }` filter that lists one referencing table's related rows. */
export function referencedFilters(row: TableRow, table: { column_name: string }) {
	return {
		[table.column_name]: { eq: row.record?.[row.relatedRecords?.referenced_on_column_name ?? ''] },
	};
}

/** "Open records in table view" query params of each referencing table. */
export function referencedTablesURLParams(row: TableRow) {
	return (row.relatedRecords?.referenced_by ?? []).map((table) => ({
		filters: JsonURL.stringify(referencedFilters(row, table)),
		page_index: 0,
	}));
}

/** One referencing table's rows as the panel lists them: an identity line plus three fields. */
export function formatReferencedRecords(res: ReferencedRowsResponse): ReferencedRecords {
	const foreignKeyMap: Record<string, string> = {};
	for (const fk of res.foreignKeys as TableForeignKey[]) foreignKeyMap[fk.column_name] = fk.referenced_column_name;

	const widgetNames = (res.widgets as Widget[]).reduce<Record<string, string>>((acc, widget) => {
		acc[widget.field_name] = widget.name;
		return acc;
	}, {});
	const displayName = (field: string) => widgetNames[field] || normalizeFieldName(field);

	const rows = res.rows.map((row) => {
		const formatted: Record<string, unknown> = {};
		for (const key in row) {
			const value = row[key];
			if (foreignKeyMap[key] && typeof value === 'object' && value !== null) {
				const object = value as Record<string, unknown>;
				const preferredKey = Object.keys(object).find((k) => k !== foreignKeyMap[key]);
				formatted[key] = preferredKey ? object[preferredKey] : object[foreignKeyMap[key]];
			} else {
				formatted[key] = formatFieldValue(
					value,
					res.structure.find((field: TableField) => field.column_name === key)?.data_type || 'text',
				);
			}
		}
		return formatted;
	});

	const identity = res.identity_column;
	const listFields = res.list_fields;
	let identityColumn: ReferencedRecords['identityColumn'];
	let fieldsOrder: string[];
	if (identity && listFields.length) {
		identityColumn = { isSet: true, fieldName: identity, displayName: displayName(identity) };
		fieldsOrder = listFields.filter((field) => field !== identity).slice(0, 3);
	} else if (identity) {
		identityColumn = { isSet: true, fieldName: identity, displayName: displayName(identity) };
		fieldsOrder = res.structure
			.filter((field) => field.column_name !== identity)
			.slice(0, 3)
			.map((field) => field.column_name);
	} else if (listFields.length) {
		const first = listFields[0] ?? '';
		identityColumn = { isSet: false, fieldName: first, displayName: displayName(first) };
		fieldsOrder = listFields.slice(1, 4);
	} else {
		const first = res.structure[0]?.column_name ?? '';
		identityColumn = { isSet: false, fieldName: first, displayName: displayName(first) };
		fieldsOrder = res.structure.slice(1, 4).map((field) => field.column_name);
	}

	const foreignKeyColumns = (res.foreignKeys as TableForeignKey[]).map((foreignKey) => foreignKey.column_name);
	const links = res.rows.map((row) =>
		res.primaryColumns.reduce<Record<string, unknown>>(
			(keys, column) => {
				if (foreignKeyColumns.includes(column.column_name)) {
					keys[column.column_name] = (row[column.column_name] as Record<string, unknown> | null)?.[
						foreignKeyMap[column.column_name] ?? ''
					];
				} else {
					keys[column.column_name] = row[column.column_name];
				}
				return keys;
			},
			{ mode: 'view' },
		),
	);

	return {
		rows,
		links,
		identityColumn,
		fieldsOrder: fieldsOrder.map((fieldName) => ({ fieldName, displayName: displayName(fieldName) })),
	};
}

/**
 * Loads the related records of `selectedRow` whenever it changes: one request per referencing
 * table (first page of 30), stored under the table name as each arrives. A table missing from
 * `records` is still loading.
 */
export function useRelatedRecords(selectedRow: Ref<TableRow | null>) {
	const tables = useTablesStore();
	const records = reactive<Record<string, ReferencedRecords>>({});
	const tablesList = ref<ReferencedTable[]>([]);
	const urlParams = ref<ReturnType<typeof referencedTablesURLParams>>([]);
	let generation = 0;

	watch(
		selectedRow,
		(row) => {
			if (!row?.columnsOrder || !row.relatedRecords?.referenced_by?.length) return;
			const current = ++generation;
			for (const key of Object.keys(records)) delete records[key];
			tablesList.value = referencedTables(row);
			urlParams.value = referencedTablesURLParams(row);

			for (const table of row.relatedRecords.referenced_by) {
				tables
					.fetchTable<ReferencedRowsResponse>({
						connectionID: row.connectionID ?? '',
						tableName: table.table_name,
						requstedPage: 1,
						chunkSize: 30,
						filters: referencedFilters(row, table),
					})
					.then((res) => {
						if (res && current === generation) records[table.table_name] = formatReferencedRecords(res);
					})
					.catch(() => {});
			}
		},
		{ immediate: true },
	);

	return { records, tables: tablesList, urlParams };
}
