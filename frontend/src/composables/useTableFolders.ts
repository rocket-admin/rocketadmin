// The logic of db-tables-list (DbTablesListComponent): the sidebar's table folders — expand and
// collapse (remembered in the UI settings), search, add/edit/delete, drag a table into a folder,
// reorder tables inside one — and the collapsed sidebar's folder rail. Every change to the folders
// is saved through PUT /table-categories.
import { computed, type MaybeRefOrGetter, reactive, ref, toValue } from 'vue';
import { normalizeTableName } from '@/lib/normalize';
import type { TableCategory } from '@/models/connection';
import type { TableProperties } from '@/models/table';
import type { ConnectionSettingsUI } from '@/models/ui-settings';
import { type TableFolder, useTablesStore } from '@/stores/tables';
import { useUiSettingsStore } from '@/stores/ui-settings';

/** The folder that lists every table. */
export const ALL_TABLES_FOLDER_ID = 'all-tables-kitten';

export interface Folder {
	id: string;
	name: string;
	expanded: boolean;
	tableIds: string[];
	iconColor?: string;
	/** A folder just added, with no tables yet: shows the "Add or drag and drop tables" prompt. */
	isEmpty?: boolean;
}

export interface TableFoldersOptions {
	connectionID: MaybeRefOrGetter<string>;
	tableFolders: MaybeRefOrGetter<TableFolder[] | null>;
	uiSettings: MaybeRefOrGetter<ConnectionSettingsUI | null | undefined>;
	selectedTable: MaybeRefOrGetter<string | null | undefined>;
}

function matches(table: TableProperties, searchTerm: string): boolean {
	return (
		table.table.toLowerCase().includes(searchTerm) ||
		!!table.display_name?.toLowerCase().includes(searchTerm) ||
		!!table.normalizedTableName?.toLowerCase().includes(searchTerm)
	);
}

export function useTableFolders(options: TableFoldersOptions) {
	const tablesStore = useTablesStore();
	const uiSettingsStore = useUiSettingsStore();

	const folders = ref<Folder[]>([]);
	const substringToSearch = ref('');
	const foundTables = ref<TableProperties[]>([]);
	const draggedTable = ref<TableProperties | null>(null);
	const dragOverFolder = ref<string | null>(null);
	const showCollapsedTableList = ref(false);
	const currentCollapsedFolder = ref<Folder | null>(null);

	let preservedFolderStates: Record<string, boolean> = {};
	let preservedActiveFolder: string | null = null;
	let preSearchFolderStates: Record<string, boolean> | null = null;

	const allTables = computed<TableProperties[]>(
		() => toValue(options.tableFolders)?.find((folder) => folder.category_id === ALL_TABLES_FOLDER_ID)?.tables || [],
	);

	const isSearching = () => substringToSearch.value.trim() !== '';

	/** ngOnInit: folders from the API categories, expanded as the UI settings remember. */
	function init(): void {
		const tableFolders = toValue(options.tableFolders) ?? [];
		foundTables.value =
			tableFolders
				.find((folder) => folder.category_id === ALL_TABLES_FOLDER_ID)
				?.tables.map((table) => ({
					table: table.table,
					display_name: table.display_name,
					normalizedTableName: normalizeTableName(table.table),
					permissions: table.permissions,
				})) ?? [];
		folders.value = tableFolders.map((category) => ({
			id: category.category_id,
			name: category.category_name,
			expanded: category.category_id === ALL_TABLES_FOLDER_ID,
			tableIds: category.tables.map((table) => table.table),
			iconColor: category.category_color,
		}));

		const expandedFolders = toValue(options.uiSettings)?.tableFoldersExpanded || ['0'];
		if (expandedFolders.length > 0) {
			for (const folder of folders.value) folder.expanded = expandedFolders.includes(folder.id);
		}
		// Without custom folders, "All tables" is always expanded.
		if (!hasCustomFolders()) {
			const all = folders.value.find((folder) => folder.id === ALL_TABLES_FOLDER_ID);
			if (all) all.expanded = true;
		}
	}

	function hasCustomFolders(): boolean {
		return folders.value.some((folder) => folder.id !== ALL_TABLES_FOLDER_ID);
	}

	/** Tables of a folder in its own order, narrowed by the search. */
	function getFolderTables(folder: Folder): TableProperties[] {
		const byName = new Map(allTables.value.map((table) => [table.table, table]));
		const folderTables = folder.tableIds
			.map((tableId) => byName.get(tableId))
			.filter((table): table is TableProperties => !!table);
		if (isSearching()) {
			const searchTerm = substringToSearch.value.toLowerCase();
			return folderTables.filter((table) => matches(table, searchTerm));
		}
		return folderTables;
	}

	function shouldShowFolder(folder: Folder): boolean {
		if (!isSearching()) return true;
		return getFolderTables(folder).length > 0;
	}

	/** Search: expands the folders with matches, and restores their states once cleared. */
	function searchSubstring(): void {
		if (!isSearching()) {
			foundTables.value = allTables.value;
			if (preSearchFolderStates) {
				for (const folder of folders.value) {
					const expanded = preSearchFolderStates[folder.id];
					if (expanded !== undefined) folder.expanded = expanded;
				}
				preSearchFolderStates = null;
			}
			return;
		}
		if (!preSearchFolderStates) {
			preSearchFolderStates = {};
			for (const folder of folders.value) preSearchFolderStates[folder.id] = folder.expanded;
		}
		const searchTerm = substringToSearch.value.toLowerCase();
		foundTables.value = allTables.value.filter((table) => matches(table, searchTerm));
		for (const folder of folders.value) {
			folder.expanded = getFolderTables(folder).some((table) =>
				foundTables.value.some((found) => found.table === table.table),
			);
		}
	}

	function toggleFolder(folderId: string): void {
		const folder = folders.value.find((candidate) => candidate.id === folderId);
		if (!folder) return;
		// "All tables" can't be collapsed while it is the only folder.
		if (folder.id === ALL_TABLES_FOLDER_ID && folder.expanded && !hasCustomFolders()) return;
		folder.expanded = !folder.expanded;
		const expandedFolders = folders.value.filter((candidate) => candidate.expanded).map((candidate) => candidate.id);
		uiSettingsStore.updateConnectionSetting(toValue(options.connectionID), 'tableFoldersExpanded', expandedFolders);
	}

	function onAddFolder(): void {
		folders.value.push({
			id: Date.now().toString(),
			name: `Folder ${folders.value.length}`,
			expanded: true,
			tableIds: [],
			isEmpty: true,
		});
		saveFolders();
	}

	function removeFolder(folderId: string): void {
		const index = folders.value.findIndex((folder) => folder.id === folderId);
		if (index > -1) {
			folders.value.splice(index, 1);
			saveFolders();
		}
	}

	/** The edit dialog's result replaces the folder. */
	function replaceFolder(result: Folder): void {
		const index = folders.value.findIndex((folder) => folder.id === result.id);
		if (index !== -1) {
			folders.value[index] = result;
			saveFolders();
		}
	}

	/** Collapsed rail: clicking the open folder closes its table list, another opens it. */
	function onCollapsedFolderClick(folder: Folder): void {
		if (currentCollapsedFolder.value?.id === folder.id) {
			showCollapsedTableList.value = false;
			currentCollapsedFolder.value = null;
		} else {
			showCollapsedTableList.value = true;
			currentCollapsedFolder.value = folder;
		}
	}

	function getCollapsedTableList(): TableProperties[] {
		return currentCollapsedFolder.value ? getFolderTables(currentCollapsedFolder.value) : [];
	}

	/** The `collapsed` input changed (ngOnChanges): remember the folder states, or restore them. */
	function onCollapsedChange(collapsed: boolean): void {
		if (collapsed) preserveFolderStates();
		else restoreFolderStates();
	}

	function preserveFolderStates(): void {
		for (const folder of folders.value) preservedFolderStates[folder.id] = folder.expanded;
		if (!hasCustomFolders()) {
			const all = folders.value.find((folder) => folder.id === ALL_TABLES_FOLDER_ID);
			if (all) {
				preservedFolderStates[all.id] = true;
				preservedActiveFolder = all.id;
			}
		} else {
			const selected = toValue(options.selectedTable);
			const active = selected ? folders.value.find((folder) => folder.tableIds.includes(selected)) : undefined;
			preservedActiveFolder = active ? active.id : null;
		}
	}

	function restoreFolderStates(): void {
		if (!hasCustomFolders()) {
			const all = folders.value.find((folder) => folder.id === ALL_TABLES_FOLDER_ID);
			if (all) {
				all.expanded = true;
				currentCollapsedFolder.value = all;
				showCollapsedTableList.value = true;
				return;
			}
		}
		for (const folder of folders.value) {
			const expanded = preservedFolderStates[folder.id];
			if (expanded !== undefined) folder.expanded = expanded;
		}
		if (Object.values(preservedFolderStates).some((expanded) => expanded)) {
			let target: Folder | undefined;
			if (preservedActiveFolder) target = folders.value.find((folder) => folder.id === preservedActiveFolder);
			if (!target) target = folders.value.find((folder) => preservedFolderStates[folder.id]);
			if (target) {
				currentCollapsedFolder.value = target;
				showCollapsedTableList.value = true;
			}
		}
	}

	/** Reordering tables inside a folder: only for editors, in the expanded sidebar, without a search. */
	function isReorderingEnabled(canEdit: boolean, collapsed: boolean): boolean {
		return canEdit && !collapsed && !isSearching();
	}

	/** A folder's tables after a drag within it. */
	function reorderFolder(folder: Folder, tableIds: string[]): void {
		if (tableIds.join('\u0000') === folder.tableIds.join('\u0000')) return;
		folder.tableIds = tableIds;
		saveFolders();
	}

	function onTableDragStart(event: DragEvent, table: TableProperties): void {
		draggedTable.value = table;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', table.table);
		}
	}

	function onTableDragEnd(): void {
		draggedTable.value = null;
		dragOverFolder.value = null;
	}

	function onFolderDragOver(event: DragEvent, folderId: string): void {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		dragOverFolder.value = folderId;
	}

	function onFolderDragLeave(event: DragEvent): void {
		// Only when actually leaving the folder, not moving onto one of its children.
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const { clientX: x, clientY: y } = event;
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) dragOverFolder.value = null;
	}

	/** A table dropped on a folder, at `insertIndex` (the end when omitted); a table already in it stays put. */
	function dropTable(folder: Folder, insertIndex: number = folder.tableIds.length): void {
		const table = draggedTable.value;
		if (table) {
			if (folder.tableIds.includes(table.table)) return;
			folder.tableIds.splice(insertIndex, 0, table.table);
			if (folder.isEmpty) folder.isEmpty = false;
			saveFolders();
		}
		draggedTable.value = null;
		dragOverFolder.value = null;
	}

	function saveFolders(): void {
		const categories: TableCategory[] = folders.value.map((folder) => ({
			category_id: folder.id,
			category_name: folder.name,
			category_color: folder.iconColor,
			tables: folder.tableIds,
		}));
		tablesStore.updateTablesFolders(toValue(options.connectionID), categories).catch(() => {});
	}

	return reactive({
		folders,
		substringToSearch,
		foundTables,
		draggedTable,
		dragOverFolder,
		showCollapsedTableList,
		currentCollapsedFolder,
		allTables,
		init,
		hasCustomFolders,
		getFolderTables,
		shouldShowFolder,
		searchSubstring,
		toggleFolder,
		onAddFolder,
		removeFolder,
		replaceFolder,
		onCollapsedFolderClick,
		getCollapsedTableList,
		onCollapsedChange,
		isReorderingEnabled,
		reorderFolder,
		onTableDragStart,
		onTableDragEnd,
		onFolderDragOver,
		onFolderDragLeave,
		dropTable,
	});
}
