// Port of frontend/src/app/components/dashboard/db-tables-data-source.ts (TablesDataSource): one
// page of a table's rows plus everything the table view derives from the rows response — columns
// and their visibility, foreign keys, widgets, field types, actions, permissions, the default sort
// and the info alerts.
//
// The CDK DataSource's BehaviorSubjects (`rowsSubject`, `loading$`) are plain reactive state:
// `rows` and `loading`. The MatPaginator the data source wrote `pageSize`/`length` into is replaced
// by `pageIndex` / `pageSize` / `total`, which the table view binds to its UiPaginator.
//
// The returned object is `reactive`, so it can be handed down as a prop (the Angular `[table]`
// input) and read without `.value` in templates.
import JSON5 from 'json5';
import { reactive } from 'vue';
import { formatFieldValue } from '@/lib/format-field-value';
import { normalizeFieldName } from '@/lib/normalize';
import { getTableTypes } from '@/lib/setup-table-row-structure';
import { type Alert, AlertActionType, AlertType } from '@/models/alert';
import {
	CustomActionType,
	type CustomEvent,
	type RelatedRecords,
	type TableField,
	type TableForeignKey,
	type Widget,
	type WidgetStructure,
} from '@/models/table';
import { type RowKeyParams, useTableRowStore } from '@/stores/table-row';
import { type TableRowsResponse, useTablesStore } from '@/stores/tables';

export interface TableColumnState {
	title: string;
	normalizedTitle: string;
	selected: boolean;
}

export type TableDataRow = Record<string, unknown>;

export interface RowsParams {
	connectionID: string;
	tableName: string;
	sortColumn?: string;
	requstedPage?: number;
	pageSize?: number;
	sortOrder?: 'ASC' | 'DESC';
	filters?: object;
	comparators?: object;
	search?: string | null;
	/** Set by paging/sorting: keeps the current columns (and their visibility) as they are. */
	isTablePageSwitched?: boolean;
	uncached?: boolean;
}

/** The parts of POST /table/rows/find the table view reads, beyond the store's common fields. */
export interface TableRowsFullResponse extends TableRowsResponse {
	identity_column?: string;
	action_events: CustomEvent[];
	table_settings: {
		list_fields: string[];
		columns_view?: string[] | null;
		ordering_field?: string | null;
		ordering?: string | null;
	};
	columns_view?: string[] | null;
	allow_csv_export: boolean;
	allow_csv_import: boolean;
	can_delete: boolean;
	sortable_by: string[];
	configured?: boolean;
	large_dataset?: boolean;
}

export interface PrimaryColumn {
	column_name: string;
	data_type?: string;
}

export function createTableDataState() {
	return {
		rows: [] as TableDataRow[],
		loading: false,
		/** 0-based page of `rows`, the page last requested. */
		pageIndex: 0,
		pageSize: 30,
		total: 0,
		structure: null as TableField[] | null,
		keyAttributes: [] as PrimaryColumn[],
		columns: [] as TableColumnState[],
		dataColumns: [] as string[],
		dataNormalizedColumns: {} as Record<string, string>,
		displayedColumns: [] as string[],
		displayedDataColumns: [] as string[],
		sortByColumns: [] as string[],
		/** undefined until the first response, like Angular's never-assigned field. */
		defaultSort: undefined as { column: string; direction: 'asc' | 'desc' } | null | undefined,
		foreignKeysList: [] as string[],
		foreignKeys: {} as Record<string, TableForeignKey>,
		widgetsList: [] as string[],
		widgets: {} as Record<string, WidgetStructure>,
		widgetsCount: 0,
		tableTypes: {} as Record<string, string>,
		relatedRecords: { referenced_on_column_name: '', referenced_by: [] } as RelatedRecords | null,
		isExportAllowed: false,
		isImportAllowed: false,
		canDelete: false,
		isEmptyTable: false,
		tableActions: [] as CustomEvent[],
		tableBulkActions: [] as CustomEvent[],
		largeDataset: false,
		identityColumn: undefined as string | undefined,
		alert_primaryKeysInfo: null as Alert | null,
		alert_settingsInfo: null as Alert | null,
		alert_widgetsWarning: null as Alert | null,
	};
}

export type TableDataState = ReturnType<typeof createTableDataState>;

/** One cell per column of the structure, formatted for display (dates, booleans, JSON). */
export function formatRow(row: TableDataRow, columns: Map<string, TableField>): TableDataRow {
	const rowToFormat: TableDataRow = {};
	for (const [columnName, columnStructure] of columns) {
		let type = '';
		if (['number', 'tinyint'].includes(columnStructure.data_type) && columnStructure.character_maximum_length === 1) {
			type = 'boolean';
		} else type = columnStructure.data_type;
		rowToFormat[columnName] = formatFieldValue(row[columnName], type);
	}
	return rowToFormat;
}

/** Widgets keyed by column, `widget_params` parsed with JSON5 (`{}` when unparseable). */
export function parseWidgets(widgets: Widget[]): Record<string, WidgetStructure> {
	return Object.assign(
		{},
		...widgets.map((widget) => {
			let parsedParams: Record<string, unknown>;
			try {
				parsedParams = JSON5.parse(widget.widget_params);
			} catch {
				parsedParams = {};
			}
			return { [widget.field_name]: { ...widget, widget_params: parsedParams } };
		}),
	);
}

/** Foreign keys keyed by their column. */
export function keyForeignKeys(foreignKeys: TableForeignKey[]): Record<string, TableForeignKey> {
	return Object.assign({}, ...foreignKeys.map((foreignKey) => ({ [foreignKey.column_name]: foreignKey })));
}

export function useTableData() {
	const tables = useTablesStore();
	const tableRow = useTableRowStore();
	const state = reactive(createTableDataState());
	let requestId = 0;

	/** A row's primary key; a foreign-key column contributes its referenced value. */
	function primaryKeyOf(row: TableDataRow, keyAttributes: PrimaryColumn[] = state.keyAttributes) {
		return Object.fromEntries(
			keyAttributes.map((column) => {
				if (state.foreignKeysList.includes(column.column_name)) {
					const referenced = state.foreignKeys[column.column_name]?.referenced_column_name ?? '';
					const cell = row[column.column_name] as Record<string, unknown> | null | undefined;
					return [column.column_name, cell?.[referenced]];
				}
				return [column.column_name, row[column.column_name]];
			}),
		);
	}

	async function fetchRows({
		connectionID,
		tableName,
		requstedPage,
		pageSize,
		sortColumn,
		sortOrder,
		filters,
		comparators,
		search,
		isTablePageSwitched,
		uncached,
	}: RowsParams): Promise<void> {
		const id = ++requestId;
		state.loading = true;
		state.alert_primaryKeysInfo = null;
		state.alert_settingsInfo = null;
		state.alert_widgetsWarning = null;

		let res: TableRowsFullResponse | null;
		try {
			res = await tables.fetchTable<TableRowsFullResponse>({
				connectionID,
				tableName,
				requstedPage: (requstedPage ?? 0) + 1 || 1,
				chunkSize: pageSize || 30,
				sortColumn,
				sortOrder,
				filters,
				comparators,
				search: search ?? undefined,
				uncached,
			});
		} catch {
			// The store already showed the error; Angular swallowed it the same way.
			if (id === requestId) state.loading = false;
			return;
		}
		// A newer request (another page, another table) owns the state now.
		if (id !== requestId) return;
		state.loading = false;
		if (!res) return;

		applyResponse(res, { connectionID, tableName, isTablePageSwitched });
		state.pageIndex = requstedPage ?? 0;
		state.pageSize = res.pagination?.perPage ?? (pageSize || 30);
		state.total = res.pagination?.total ?? 0;
	}

	function applyResponse(
		res: TableRowsFullResponse,
		{
			connectionID,
			tableName,
			isTablePageSwitched,
		}: Pick<RowsParams, 'connectionID' | 'tableName' | 'isTablePageSwitched'>,
	): void {
		if (res.rows?.length) {
			const firstRow = res.rows[0] ?? {};
			state.foreignKeysList = res.foreignKeys.map((field) => field.column_name);
			state.foreignKeys = keyForeignKeys(res.foreignKeys);

			const keys = primaryKeyOf(firstRow, res.primaryColumns);
			tableRow
				.fetchTableRow<{ referenced_table_names_and_columns: RelatedRecords[] }>(
					connectionID,
					tableName,
					keys as RowKeyParams,
				)
				.then((row) => {
					state.relatedRecords = row.referenced_table_names_and_columns[0] ?? null;
				})
				.catch(() => {});
		}

		state.structure = [...res.structure];
		const columns = res.structure.reduce((items, item) => {
			items.set(item.column_name, item);
			return items;
		}, new Map<string, TableField>());

		if (res.rows) {
			state.isEmptyTable = res.rows.length === 0;
			state.rows = res.rows.map((row) => formatRow(row, columns));
		} else {
			state.isEmptyTable = true;
		}
		state.keyAttributes = res.primaryColumns;
		state.identityColumn = res.identity_column;
		state.tableActions = res.action_events;
		state.tableBulkActions = res.action_events.filter((action) => action.type === CustomActionType.Multiple);

		if (res.widgets) {
			state.widgetsList = res.widgets.map((widget) => widget.field_name);
			state.widgetsCount = state.widgetsList.length;
			state.widgets = parseWidgets(res.widgets);
		}

		state.tableTypes = getTableTypes(res.structure, state.foreignKeysList);

		const settings = res.table_settings;
		let orderedColumns: TableField[];
		if (settings.list_fields.length) {
			orderedColumns = [...res.structure].sort(
				(fieldA, fieldB) =>
					settings.list_fields.indexOf(fieldA.column_name) - settings.list_fields.indexOf(fieldB.column_name),
			);
		} else {
			orderedColumns = [...res.structure];
		}

		if (isTablePageSwitched === undefined) {
			const normalizedTitle = (column: string) => state.widgets[column]?.name || normalizeFieldName(column);
			state.columns = orderedColumns
				.filter((item) => item.isExcluded === false)
				.map((item, index) => {
					let selected: boolean;
					if (settings.columns_view && settings.columns_view.length !== 0) {
						selected = settings.columns_view.includes(item.column_name);
					} else if (res.columns_view && res.columns_view.length !== 0) {
						selected = res.columns_view.includes(item.column_name);
					} else {
						selected = index < 6;
					}
					return { title: item.column_name, normalizedTitle: normalizedTitle(item.column_name), selected };
				});
		}

		state.dataColumns = state.columns.map((column) => column.title);
		state.dataNormalizedColumns = state.columns.reduce<Record<string, string>>((normalizedColumns, column) => {
			normalizedColumns[column.title] = column.normalizedTitle;
			return normalizedColumns;
		}, {});
		state.displayedDataColumns = state.columns.filter((column) => column.selected).map((column) => column.title);
		if (state.keyAttributes.length) {
			state.displayedColumns = ['select', ...state.displayedDataColumns, 'actions'];
		} else {
			state.displayedColumns = [...state.displayedDataColumns];
			state.alert_primaryKeysInfo = {
				id: 10000,
				type: AlertType.Info,
				message: 'Add primary keys through your database to be able to work with the table rows.',
				actions: [{ type: AlertActionType.Anchor, caption: 'Instruction', to: 'https://docs.rocketadmin.com/' }],
			};
		}

		state.isExportAllowed = res.allow_csv_export;
		state.isImportAllowed = res.allow_csv_import;
		state.canDelete = res.can_delete;
		state.sortByColumns = res.sortable_by;

		// Only a default sort when both ordering_field and ordering are present.
		if (settings.ordering_field && settings.ordering) {
			state.defaultSort = {
				column: settings.ordering_field,
				direction: settings.ordering.toLowerCase() as 'asc' | 'desc',
			};
		} else {
			state.defaultSort = null;
		}

		const widgetsConfigured = res.widgets?.length;
		if (!res.configured && !widgetsConfigured) {
			state.alert_settingsInfo = {
				id: 10001,
				type: AlertType.Info,
				message: 'Configure now to reveal advanced table functionality and features.',
				actions: [
					{ type: AlertActionType.Link, caption: 'Configure all', to: `/auto-configure/${connectionID}` },
					{ type: AlertActionType.Link, caption: 'Settings', to: 'settings' },
					{ type: AlertActionType.Link, caption: 'Fields display', to: 'widgets' },
				],
			};
		}

		state.largeDataset = !!res.large_dataset;
	}

	/** After a column's checkbox changed: recompute the visible columns (changleColumnList). */
	function changeColumnList(): void {
		state.displayedDataColumns = state.columns.filter((column) => column.selected).map((column) => column.title);
		if (state.keyAttributes.length) {
			state.displayedColumns = ['select', ...state.displayedDataColumns, 'actions'];
		} else {
			state.displayedColumns = [...state.displayedDataColumns];
		}
	}

	/** The row's primary key as entry-page query params; `'dub'` adds `action=dub` (duplicate). */
	function getQueryParams(row: TableDataRow, action?: 'dub'): Record<string, unknown> {
		const params = primaryKeyOf(row);
		return action === 'dub' ? { ...params, action: 'dub' } : params;
	}

	return Object.assign(state, { fetchRows, changeColumnList, getQueryParams });
}

export type TableData = ReturnType<typeof useTableData>;
