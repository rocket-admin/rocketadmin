import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { TableProperties } from '@/models/table';
import type { ConnectionSettingsUI } from '@/models/ui-settings';
import type { TableFolder } from '@/stores/tables';
import { ALL_TABLES_FOLDER_ID, useTableFolders } from './useTableFolders';

const tables = vi.hoisted(() => ({ updateTablesFolders: vi.fn() }));
const uiSettings = vi.hoisted(() => ({ updateConnectionSetting: vi.fn() }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));

const permissions = { visibility: true, readonly: false, add: true, delete: true, edit: true };
const table = (name: string, display_name?: string): TableProperties => ({
	table: name,
	display_name,
	normalizedTableName: display_name ?? name,
	permissions,
});

const all = [table('users'), table('orders'), table('order_items', 'Line items'), table('products')];

function setup(folders: TableFolder[], settings: Partial<ConnectionSettingsUI> | null = null, selected = 'users') {
	const tableFolders = ref<TableFolder[] | null>(folders);
	const state = useTableFolders({
		connectionID: 'conn',
		tableFolders,
		uiSettings: settings as ConnectionSettingsUI | null,
		selectedTable: selected,
	});
	state.init();
	return state;
}

const onlyAll: TableFolder[] = [{ category_id: ALL_TABLES_FOLDER_ID, category_name: 'All tables', tables: all }];
const withSales: TableFolder[] = [
	...onlyAll,
	{
		category_id: 'sales',
		category_name: 'Sales',
		category_color: '#4CAF50',
		tables: [table('orders'), table('order_items', 'Line items')],
	},
];

describe('useTableFolders', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tables.updateTablesFolders.mockResolvedValue([]);
	});

	it('builds the folders from the categories and keeps "All tables" open without custom folders', () => {
		const state = setup(onlyAll, { tableFoldersExpanded: [] });
		expect(state.folders).toEqual([
			{
				id: ALL_TABLES_FOLDER_ID,
				name: 'All tables',
				expanded: true,
				tableIds: ['users', 'orders', 'order_items', 'products'],
				iconColor: undefined,
			},
		]);
		expect(state.hasCustomFolders()).toBe(false);
		// It can't be collapsed either.
		state.toggleFolder(ALL_TABLES_FOLDER_ID);
		expect(state.folders[0]?.expanded).toBe(true);
		expect(uiSettings.updateConnectionSetting).not.toHaveBeenCalled();
	});

	it('expands the folders the UI settings remember and saves toggles there', () => {
		const state = setup(withSales, { tableFoldersExpanded: ['sales'] });
		expect(state.folders.map((folder) => folder.expanded)).toEqual([false, true]);
		state.toggleFolder(ALL_TABLES_FOLDER_ID);
		expect(uiSettings.updateConnectionSetting).toHaveBeenCalledWith('conn', 'tableFoldersExpanded', [
			ALL_TABLES_FOLDER_ID,
			'sales',
		]);
	});

	it('searches by name, display name and normalized name, expanding matching folders and restoring them after', () => {
		const state = setup(withSales, { tableFoldersExpanded: [ALL_TABLES_FOLDER_ID] });
		state.substringToSearch = 'line';
		state.searchSubstring();
		expect(state.foundTables.map((found) => found.table)).toEqual(['order_items']);
		expect(state.folders.map((folder) => folder.expanded)).toEqual([true, true]);
		expect(state.getFolderTables(state.folders[1] ?? state.folders[0]!).map((found) => found.table)).toEqual([
			'order_items',
		]);

		state.substringToSearch = 'nothing-like-this';
		state.searchSubstring();
		expect(state.foundTables).toEqual([]);
		expect(state.shouldShowFolder(state.folders[0]!)).toBe(false);

		state.substringToSearch = '';
		state.searchSubstring();
		expect(state.folders.map((folder) => folder.expanded)).toEqual([true, false]);
		expect(state.foundTables).toHaveLength(4);
	});

	it('adds, replaces and removes folders, saving the categories each time', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1234);
		const state = setup(onlyAll);
		state.onAddFolder();
		expect(state.folders[1]).toEqual({ id: '1234', name: 'Folder 1', expanded: true, tableIds: [], isEmpty: true });
		expect(tables.updateTablesFolders).toHaveBeenLastCalledWith('conn', [
			{
				category_id: ALL_TABLES_FOLDER_ID,
				category_name: 'All tables',
				category_color: undefined,
				tables: ['users', 'orders', 'order_items', 'products'],
			},
			{ category_id: '1234', category_name: 'Folder 1', category_color: undefined, tables: [] },
		]);

		state.replaceFolder({ id: '1234', name: 'Mine', expanded: true, tableIds: ['users'], iconColor: '#2196F3' });
		expect(tables.updateTablesFolders).toHaveBeenLastCalledWith('conn', [
			expect.objectContaining({ category_id: ALL_TABLES_FOLDER_ID }),
			{ category_id: '1234', category_name: 'Mine', category_color: '#2196F3', tables: ['users'] },
		]);

		state.removeFolder('1234');
		expect(state.folders).toHaveLength(1);
		expect(tables.updateTablesFolders).toHaveBeenCalledTimes(3);
		vi.restoreAllMocks();
	});

	it('drops a dragged table into a folder once, at the drop position', () => {
		const state = setup(withSales);
		const sales = state.folders[1]!;
		state.onTableDragStart(new Event('dragstart') as DragEvent, table('users'));
		state.dropTable(sales, 1);
		expect(sales.tableIds).toEqual(['orders', 'users', 'order_items']);
		expect(tables.updateTablesFolders).toHaveBeenCalledTimes(1);
		expect(state.draggedTable).toBeNull();

		state.onTableDragStart(new Event('dragstart') as DragEvent, table('orders'));
		state.dropTable(sales);
		expect(sales.tableIds).toEqual(['orders', 'users', 'order_items']);
		expect(tables.updateTablesFolders).toHaveBeenCalledTimes(1);
	});

	it('reorders a folder and only allows it for editors in the expanded sidebar without a search', () => {
		const state = setup(withSales);
		const sales = state.folders[1]!;
		state.reorderFolder(sales, ['order_items', 'orders']);
		expect(sales.tableIds).toEqual(['order_items', 'orders']);
		state.reorderFolder(sales, ['order_items', 'orders']);
		expect(tables.updateTablesFolders).toHaveBeenCalledTimes(1);

		expect(state.isReorderingEnabled(true, false)).toBe(true);
		expect(state.isReorderingEnabled(false, false)).toBe(false);
		expect(state.isReorderingEnabled(true, true)).toBe(false);
		state.substringToSearch = 'x';
		expect(state.isReorderingEnabled(true, false)).toBe(false);
	});

	it('opens the collapsed rail on the folder holding the selected table', () => {
		const state = setup(withSales, { tableFoldersExpanded: ['sales'] }, 'orders');
		state.onCollapsedChange(true);
		state.onCollapsedChange(false);
		expect(state.currentCollapsedFolder?.id).toBe(ALL_TABLES_FOLDER_ID);
		expect(state.showCollapsedTableList).toBe(true);

		state.onCollapsedFolderClick(state.folders[1]!);
		expect(state.getCollapsedTableList().map((found) => found.table)).toEqual(['orders', 'order_items']);
		state.onCollapsedFolderClick(state.folders[1]!);
		expect(state.showCollapsedTableList).toBe(false);
		expect(state.getCollapsedTableList()).toEqual([]);
	});
});
