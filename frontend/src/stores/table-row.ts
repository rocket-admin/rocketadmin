// Port of TableRowService: read, add, update and delete one row. The 'delete row' event of `cast`
// is now `tableEvents.emit('rowDeleted')` (src/lib/table-events.ts).
import { defineStore } from 'pinia';
import { api, type QueryParams } from '@/api/client';
import { tableEvents } from '@/lib/table-events';
import type { TableField, TableForeignKey, Widget } from '@/models/table';

/** The row's primary key as query params, e.g. `{ id: 42 }`. */
export type RowKeyParams = QueryParams;

/** GET /table/row/:id. Only the commonly read fields are typed; the rest pass through. */
export interface TableRowResponse {
	row: Record<string, unknown>;
	structure: TableField[];
	primaryColumns: { column_name: string; data_type: string }[];
	foreignKeys: TableForeignKey[];
	table_widgets: Widget[];
	readonly_fields: string[];
	[key: string]: unknown;
}

export const useTableRowStore = defineStore('tableRow', () => {
	function fetchTableRow<T = TableRowResponse>(
		connectionID: string,
		tableName: string,
		params: RowKeyParams,
	): Promise<T> {
		return api.get<T>(`/table/row/${connectionID}`, { params: { ...params, tableName }, notify: 'snackbar' });
	}

	function addTableRow<T = TableRowResponse>(
		connectionID: string,
		tableName: string,
		row: Record<string, unknown>,
	): Promise<T> {
		return api.post<T>(`/table/row/${connectionID}`, row, {
			params: { tableName },
			notify: 'alert',
			successMessage: `The row has been added successfully to "${tableName}" table.`,
		});
	}

	function updateTableRow<T = TableRowResponse>(
		connectionID: string,
		tableName: string,
		params: RowKeyParams,
		tableRow: Record<string, unknown>,
	): Promise<T> {
		return api.put<T>(`/table/row/${connectionID}`, tableRow, {
			params: { ...params, tableName },
			notify: 'alert',
			successMessage: `The row has been updated successfully in "${tableName}" table.`,
		});
	}

	async function deleteTableRow(connectionID: string, tableName: string, params: RowKeyParams): Promise<void> {
		await api.delete(`/table/row/${connectionID}`, {
			params: { ...params, tableName },
			notify: 'snackbar',
			successMessage: `Row has been deleted successfully from "${tableName}" table.`,
		});
		tableEvents.emit('rowDeleted', { connectionID, tableName });
	}

	return { fetchTableRow, addTableRow, updateTableRow, deleteTableRow };
});
