<script setup lang="ts">
// Port of dashboard/db-tables-list (DbTablesListComponent): the table sidebar. Expanded, it has
// a search, "Add folder" and the folders — "All tables" plus the user's own — each listing its
// tables as links (first page, 30 rows). Editors can drag a table's link onto a folder to add it,
// reorder a folder's tables by their handle (vuedraggable, in place of cdkDropList), and edit or
// delete a folder from its menu. Collapsed, it is a rail of folder icons whose table list shows
// as initials/icons.
//
// The folder state and every save live in useTableFolders; this component is the markup.
import { nextTick, ref, watch } from 'vue';
import Draggable from 'vuedraggable';
import AppContentLoader from '@/components/shared/AppContentLoader.vue';
import { UiButton, UiIcon, UiIconButton, UiInput, UiMenu, UiMenuItem, vTooltip } from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import { ALL_TABLES_FOLDER_ID, type Folder, useTableFolders } from '@/composables/useTableFolders';
import { FIRST_PAGE_QUERY } from '@/lib/table-query';
import type { TableProperties } from '@/models/table';
import type { ConnectionSettingsUI } from '@/models/ui-settings';
import { useConnectionsStore } from '@/stores/connections';
import { useTableStateStore } from '@/stores/table-state';
import type { TableFolder } from '@/stores/tables';
import FolderDeleteDialog from './FolderDeleteDialog.vue';
import FolderEditDialog from './FolderEditDialog.vue';
import { FOLDER_ICON_COLORS } from './folderColors';

const props = withDefaults(
	defineProps<{
		connectionID: string;
		connectionTitle?: string;
		/** null while loading. */
		tableFolders: TableFolder[] | null;
		selectedTable?: string | null;
		collapsed?: boolean;
		uiSettings?: ConnectionSettingsUI | null;
	}>(),
	{ connectionTitle: '', selectedTable: null, collapsed: false, uiSettings: null },
);

const emit = defineEmits<{ expandSidebar: [] }>();

const connections = useConnectionsStore();
const tableState = useTableStateStore();
const dialog = useDialog();

const state = useTableFolders({
	connectionID: () => props.connectionID,
	tableFolders: () => props.tableFolders,
	uiSettings: () => props.uiSettings,
	selectedTable: () => props.selectedTable,
});
state.init();

watch(
	() => props.collapsed,
	(collapsed) => state.onCollapsedChange(collapsed),
);

const searchInput = ref<InstanceType<typeof UiInput> | null>(null);
const canEdit = () => connections.canEditConnection;

function getTableName(table: TableProperties): string {
	return table.display_name || table.normalizedTableName || table.table;
}

function tableLink(table: TableProperties) {
	return { path: `/dashboard/${props.connectionID}/${table.table}`, query: { ...FIRST_PAGE_QUERY } };
}

function closeSidebar() {
	tableState.clearSelection();
	tableState.closeAIpanel();
}

/** The collapsed rail's search: expands the sidebar and focuses its search once it is shown. */
function toggleCollapsedSearch() {
	emit('expandSidebar');
	setTimeout(async () => {
		await nextTick();
		const input = (searchInput.value?.$el as HTMLInputElement | undefined) ?? null;
		input?.focus();
		input?.select();
	}, 300);
}

async function deleteFolder(folder: Folder) {
	const confirmed = await dialog
		.open<boolean>(FolderDeleteDialog, { data: { folderName: folder.name, tableCount: folder.tableIds.length } })
		.afterClosed();
	if (confirmed) state.removeFolder(folder.id);
}

async function showEditTablesDialog(folder: Folder) {
	folder.expanded = true;
	const result = await dialog
		.open<Folder>(FolderEditDialog, {
			data: {
				folder: { ...folder, tableIds: [...folder.tableIds] },
				tables: state.allTables,
				folderIconColors: FOLDER_ICON_COLORS,
			},
		})
		.afterClosed();
	if (result) state.replaceFolder(result);
}

/** vuedraggable `change` inside one folder: move the table id as cdk moveItemInArray did. */
function onReorder(folder: Folder, event: { moved?: { oldIndex: number; newIndex: number } }) {
	if (!event.moved) return;
	const { oldIndex, newIndex } = event.moved;
	if (oldIndex === newIndex) return;
	const tableIds = [...folder.tableIds];
	const [moved] = tableIds.splice(oldIndex, 1);
	if (moved === undefined) return;
	tableIds.splice(newIndex, 0, moved);
	state.reorderFolder(folder, tableIds);
}

/** Where in the folder a dragged table lands: before the first item whose middle is below the pointer. */
function dropIndex(event: DragEvent, folder: Folder): number {
	const items = [...(event.currentTarget as HTMLElement).querySelectorAll('.tables-list__table')];
	const index = items.findIndex((item) => {
		const rect = item.getBoundingClientRect();
		return event.clientY < rect.top + rect.height / 2;
	});
	if (index !== -1) return index;
	return folder.tableIds.length;
}

function onDragOver(event: DragEvent, folder: Folder) {
	if (canEdit()) state.onFolderDragOver(event, folder.id);
}

function onDragLeave(event: DragEvent) {
	if (canEdit()) state.onFolderDragLeave(event);
}

function onDrop(event: DragEvent, folder: Folder) {
	if (!canEdit()) return;
	event.preventDefault();
	state.dropTable(folder, dropIndex(event, folder));
}

function onTableDragStart(event: DragEvent, table: TableProperties) {
	if (canEdit()) state.onTableDragStart(event, table);
}

function onTableDragEnd() {
	if (canEdit()) state.onTableDragEnd();
}

function folderIcon(folder: Folder): string {
	return folder.id === ALL_TABLES_FOLDER_ID ? 'dehaze' : 'folder';
}
</script>

<template>
	<AppContentLoader v-if="tableFolders === null" />

	<div v-else-if="state.allTables.length" class="tables-list">
		<!-- Collapsed rail -->
		<div v-if="collapsed" class="tables-list__rail">
			<div class="tables-list__rail-top">
				<UiIconButton v-tooltip:right="'Search'" icon="search" label="Search" @click="toggleCollapsedSearch" />

				<div v-if="state.folders.length > 0" class="tables-list__rail-folders">
					<button
						v-for="folder in state.folders"
						:key="folder.id"
						v-tooltip:right="folder.name"
						type="button"
						class="tables-list__rail-folder"
						:class="{ 'tables-list__rail-folder--active': state.currentCollapsedFolder?.id === folder.id }"
						:aria-label="folder.name"
						:aria-pressed="state.currentCollapsedFolder?.id === folder.id"
						@click="state.onCollapsedFolderClick(folder)"
					>
						<UiIcon
							:name="folderIcon(folder)"
							:style="folder.id !== ALL_TABLES_FOLDER_ID && folder.iconColor ? { color: folder.iconColor } : undefined"
						/>
					</button>
				</div>
				<span v-else v-tooltip:right="'All Tables'" class="tables-list__rail-folder">
					<UiIcon name="dehaze" label="All Tables" />
				</span>

				<div v-if="state.showCollapsedTableList" class="tables-list__rail-tables">
					<RouterLink
						v-for="tableItem in state.getCollapsedTableList()"
						:key="tableItem.table"
						v-tooltip:right="getTableName(tableItem)"
						:to="tableLink(tableItem)"
						class="tables-list__rail-table"
						:class="{ 'tables-list__rail-table--active': selectedTable === tableItem.table }"
						:aria-label="getTableName(tableItem)"
						@click="closeSidebar"
					>
						<UiIcon v-if="tableItem.icon" :name="tableItem.icon" size="sm" />
						<template v-else>{{ tableItem.initials }}</template>
					</RouterLink>
				</div>
			</div>

			<div v-if="canEdit()" class="tables-list__rail-bottom">
				<UiIconButton v-tooltip:right="'Add folder'" icon="add" label="Add folder" @click="state.onAddFolder()" />
			</div>
		</div>

		<!-- Expanded sidebar -->
		<div v-else class="tables-list__expanded" :class="{ 'tables-list__expanded--with-folders': state.hasCustomFolders() }">
			<div class="tables-list__search">
				<UiInput
					ref="searchInput"
					v-model="state.substringToSearch"
					type="search"
					name="search"
					placeholder="Search"
					aria-label="Search tables"
					:invalid="state.foundTables.length === 0"
					@keyup="state.searchSubstring()"
				/>
				<p v-if="state.foundTables.length === 0" class="tables-list__search-error" role="alert">Nothing found.</p>
			</div>

			<div v-if="canEdit()" class="tables-list__add-folder">
				<UiButton variant="secondary" size="sm" block @click="state.onAddFolder()">
					<template #leading><UiIcon name="add" size="sm" /></template>
					Add folder
				</UiButton>
			</div>

			<div v-if="state.folders.length > 0" class="tables-list__folders">
				<template v-for="folder in state.folders" :key="folder.id">
					<div
						v-if="state.shouldShowFolder(folder)"
						class="tables-list__folder"
						:class="{
							'tables-list__folder--expanded': folder.expanded,
							'tables-list__folder--drag-over':
								canEdit() && state.dragOverFolder !== ALL_TABLES_FOLDER_ID && state.dragOverFolder === folder.id,
						}"
						:data-testid="`tables-folder-${folder.id}`"
						@dragover="onDragOver($event, folder)"
						@dragleave="onDragLeave"
						@drop="onDrop($event, folder)"
					>
						<div class="tables-list__folder-header">
							<button
								type="button"
								class="tables-list__folder-toggle"
								:aria-expanded="folder.expanded"
								@click="state.toggleFolder(folder.id)"
							>
								<UiIcon
									:name="folderIcon(folder)"
									size="sm"
									class="tables-list__folder-icon"
									:style="folder.iconColor ? { color: folder.iconColor } : undefined"
								/>
								<span v-tooltip="folder.name.length > 18 ? folder.name : ''" class="tables-list__folder-name">
									{{ folder.name }}
								</span>
								<UiIcon
									v-if="folder.id !== ALL_TABLES_FOLDER_ID || state.hasCustomFolders()"
									name="chevron_right"
									size="sm"
									class="tables-list__folder-chevron"
								/>
							</button>
							<UiMenu v-if="folder.id !== ALL_TABLES_FOLDER_ID && canEdit()" align="end" label="Folder options">
								<template #trigger="{ triggerProps }">
									<UiIconButton v-bind="triggerProps" icon="more_vert" label="Folder options" size="sm" />
								</template>
								<UiMenuItem icon="edit_note" @select="showEditTablesDialog(folder)">Edit</UiMenuItem>
								<UiMenuItem icon="delete" @select="deleteFolder(folder)">Delete</UiMenuItem>
							</UiMenu>
						</div>

						<div v-if="folder.expanded" class="tables-list__folder-tables">
							<Draggable
								v-if="state.getFolderTables(folder).length > 0"
								:model-value="state.getFolderTables(folder)"
								item-key="table"
								tag="ul"
								class="tables-list__tables"
								handle=".tables-list__drag-handle"
								:force-fallback="true"
								:disabled="!state.isReorderingEnabled(canEdit(), collapsed)"
								@change="onReorder(folder, $event)"
							>
								<template #item="{ element: table }">
									<li
										v-tooltip="getTableName(table).length > 18 ? getTableName(table) : ''"
										class="tables-list__table"
									>
										<UiIcon
											v-if="state.isReorderingEnabled(canEdit(), collapsed)"
											name="drag_indicator"
											size="sm"
											class="tables-list__drag-handle"
										/>
										<RouterLink
											:to="tableLink(table)"
											class="tables-list__table-link"
											:class="{ 'tables-list__table-link--active': selectedTable === table.table }"
											:draggable="canEdit()"
											@dragstart="onTableDragStart($event, table)"
											@dragend="onTableDragEnd"
											@click="closeSidebar"
										>
											<span class="tables-list__table-name">{{ getTableName(table) }}</span>
										</RouterLink>
									</li>
								</template>
							</Draggable>
							<div
								v-else
								class="tables-list__no-tables"
								:class="{ 'tables-list__no-tables--empty-folder': folder.isEmpty }"
							>
								<p v-if="!folder.isEmpty">No tables in this folder</p>
								<UiButton variant="secondary" size="sm" @click="showEditTablesDialog(folder)">
									{{ folder.isEmpty ? 'Add or drag and drop tables' : 'Add table' }}
								</UiButton>
							</div>
						</div>
					</div>
				</template>
			</div>
		</div>
	</div>

	<div v-else class="tables-list__empty">
		<p>No tables in this connection.</p>
		<p>
			Rocketadmin do not provide adding and deleting database tables, only editing ones. You can add a table with SQL
			editor.
		</p>
	</div>
</template>

<style scoped>
.tables-list {
	height: 100%;
}

.tables-list__rail {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	height: 100%;
	padding: var(--space-2) 0;
}

.tables-list__rail-top,
.tables-list__rail-folders,
.tables-list__rail-tables {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-1);
}

.tables-list__rail-tables {
	padding-top: var(--space-2);
	border-top: 1px solid var(--color-line);
}

.tables-list__rail-bottom {
	display: flex;
	justify-content: center;
	padding-top: var(--space-2);
}

.tables-list__rail-folder,
.tables-list__rail-table {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border: 0;
	border-radius: var(--radius-control);
	background: transparent;
	color: var(--color-ink-soft);
	font: inherit;
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
	text-decoration: none;
	cursor: pointer;
}

.tables-list__rail-folder:hover,
.tables-list__rail-table:hover {
	background: var(--color-paper-2);
}

.tables-list__rail-folder--active,
.tables-list__rail-table--active {
	background: var(--color-paper-2);
	color: var(--color-accent);
}

.tables-list__rail-folder:focus-visible,
.tables-list__rail-table:focus-visible {
	outline: none;
	box-shadow: var(--ring-focus);
}

.tables-list__expanded {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	padding: var(--space-3);
}

/* With custom folders, "Add folder" moves under the folders, as the Angular CSS `order` did. */
.tables-list__expanded--with-folders .tables-list__add-folder {
	order: 3;
}

.tables-list__search-error {
	margin: var(--space-1) 0 0;
	color: var(--color-danger);
	font-size: var(--text-xs);
}

.tables-list__folders {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
}

.tables-list__folder {
	border: 1px solid transparent;
	border-radius: var(--radius-control);
}

.tables-list__folder--drag-over {
	border-color: var(--color-accent);
	background: var(--color-paper-2);
}

.tables-list__folder-header {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.tables-list__folder-toggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--space-2);
	min-width: 0;
	padding: var(--space-2);
	border: 0;
	border-radius: var(--radius-control);
	background: transparent;
	color: var(--color-ink);
	font: inherit;
	font-weight: var(--weight-medium);
	text-align: start;
	cursor: pointer;
}

.tables-list__folder-toggle:hover {
	background: var(--color-paper-2);
}

.tables-list__folder-toggle:focus-visible {
	outline: none;
	box-shadow: var(--ring-focus);
}

.tables-list__folder-icon {
	flex-shrink: 0;
	color: var(--color-ink-soft);
}

.tables-list__folder-name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tables-list__folder-chevron {
	flex-shrink: 0;
	color: var(--color-muted);
	transition: transform var(--motion-fast);
}

.tables-list__folder--expanded .tables-list__folder-chevron {
	transform: rotate(90deg);
}

.tables-list__tables {
	margin: 0;
	padding: 0 0 var(--space-1) var(--space-3);
	list-style: none;
}

.tables-list__table {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.tables-list__drag-handle {
	flex-shrink: 0;
	color: var(--color-muted);
	cursor: grab;
	opacity: 0;
}

.tables-list__table:hover .tables-list__drag-handle {
	opacity: 1;
}

.tables-list__table-link {
	flex: 1;
	min-width: 0;
	padding: var(--space-1) var(--space-2);
	border-radius: var(--radius-control);
	color: var(--color-ink-soft);
	text-decoration: none;
}

.tables-list__table-link:hover {
	background: var(--color-paper-2);
	color: var(--color-ink);
}

.tables-list__table-link:focus-visible {
	outline: none;
	box-shadow: var(--ring-focus);
}

.tables-list__table-link--active {
	background: var(--color-paper-2);
	color: var(--color-accent);
	font-weight: var(--weight-medium);
}

.tables-list__table-name {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tables-list__no-tables {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--space-2);
	padding: var(--space-2) var(--space-3);
	color: var(--color-muted);
	font-size: var(--text-sm);
}

.tables-list__no-tables p {
	margin: 0;
}

.tables-list__no-tables--empty-folder {
	align-items: stretch;
	border: 1px dashed var(--color-line-strong);
	border-radius: var(--radius-control);
	margin: 0 var(--space-2) var(--space-2);
}

.tables-list__empty {
	padding: var(--space-4);
	color: var(--color-ink-soft);
}
</style>
