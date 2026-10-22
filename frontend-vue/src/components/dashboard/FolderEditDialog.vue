<script setup lang="ts">
// Port of db-tables-list/db-folder-edit-dialog: rename a sidebar folder, pick its icon colour and
// add/remove its tables. Works on a copy; "Save" closes with the edited folder (name trimmed), and
// is refused while the name is empty. The "All Tables" folder can't be renamed.
import { reactive, ref } from 'vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { UiButton, UiField, UiInput } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { Folder } from '@/composables/useTableFolders';
import type { TableProperties } from '@/models/table';
import { DEFAULT_FOLDER_COLOR, type FolderIconColor } from './folderColors';

export interface FolderEditDialogData {
	folder: Folder;
	tables: TableProperties[];
	folderIconColors: FolderIconColor[];
}

const props = defineProps<{ data: FolderEditDialogData }>();

const dialogRef = useDialogRef<Folder>();

const folder = reactive<Folder>({
	...props.data.folder,
	tableIds: [...props.data.folder.tableIds],
	iconColor: props.data.folder.iconColor || DEFAULT_FOLDER_COLOR,
});
const touched = ref(false);

const isAllTablesFolder = folder.id === '0' || folder.name === 'All Tables';

function nameError(): string | undefined {
	return touched.value && (!folder.name || folder.name.trim() === '') ? 'Folder name is required' : undefined;
}

function isTableInFolder(table: TableProperties): boolean {
	return folder.tableIds.includes(table.table);
}

function getTableName(table: TableProperties): string {
	return table.display_name || table.table;
}

function toggleTableInFolder(table: TableProperties) {
	if (isTableInFolder(table)) {
		folder.tableIds = folder.tableIds.filter((id) => id !== table.table);
	} else {
		folder.tableIds.push(table.table);
		if (folder.isEmpty) folder.isEmpty = false;
	}
}

function onSave() {
	touched.value = true;
	if (!folder.name || folder.name.trim() === '') return;
	folder.name = folder.name.trim();
	dialogRef.close({ ...folder, tableIds: [...folder.tableIds] });
}
</script>

<template>
	<AppDialogForm title="Edit folder" submit-label="Save" @submit="onSave">
		<div class="folder-edit">
			<UiField
				label="Folder name"
				:hint="isAllTablesFolder ? 'The &quot;All Tables&quot; folder cannot be renamed' : undefined"
				:error="nameError()"
				required
				class="folder-edit__section"
			>
				<UiInput
					v-model="folder.name"
					name="folderName"
					:disabled="isAllTablesFolder"
					required
					@blur="touched = true"
				/>
			</UiField>

			<fieldset class="folder-edit__section folder-edit__colors">
				<legend class="folder-edit__heading">Folder icon color</legend>
				<div class="folder-edit__swatches">
					<label
						v-for="color in data.folderIconColors"
						:key="color.value"
						class="folder-edit__swatch-label"
						:class="{ 'folder-edit__swatch-label--selected': folder.iconColor === color.value }"
						:title="color.name"
					>
						<input
							v-model="folder.iconColor"
							type="radio"
							class="folder-edit__swatch-input"
							name="folderColor"
							:value="color.value"
							:aria-label="color.name"
						>
						<span class="folder-edit__swatch" :style="{ backgroundColor: color.value }" />
					</label>
				</div>
			</fieldset>

			<section class="folder-edit__tables">
				<h3 class="folder-edit__heading">Manage tables in this folder</h3>
				<ul class="folder-edit__table-list">
					<li v-for="table in data.tables" :key="table.table" class="folder-edit__table">
						<span class="folder-edit__table-name">{{ getTableName(table) }}</span>
						<UiButton
							size="sm"
							:variant="isTableInFolder(table) ? 'ghost' : 'secondary'"
							@click="toggleTableInFolder(table)"
						>
							{{ isTableInFolder(table) ? 'Remove' : 'Add' }}
						</UiButton>
					</li>
				</ul>
			</section>
		</div>
	</AppDialogForm>
</template>

<style scoped>
.folder-edit {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.folder-edit__section {
	padding-bottom: var(--space-4);
	border-bottom: 1px solid var(--color-line);
}

.folder-edit__colors {
	margin: 0;
	padding-top: 0;
	padding-inline: 0;
	border-top: 0;
	border-inline: 0;
}

.folder-edit__heading {
	margin: 0 0 var(--space-3);
	padding: 0;
	color: var(--color-ink-soft);
	font-size: var(--text-sm);
	font-weight: var(--weight-medium);
}

.folder-edit__swatches {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-3);
}

.folder-edit__swatch-label {
	position: relative;
	display: inline-block;
	cursor: pointer;
}

.folder-edit__swatch-input {
	position: absolute;
	width: 0;
	height: 0;
	opacity: 0;
}

.folder-edit__swatch {
	display: block;
	width: 2.5rem;
	height: 2.5rem;
	border: 2px solid transparent;
	border-radius: 50%;
	box-shadow: var(--shadow-card);
	transition: transform var(--motion-fast);
}

.folder-edit__swatch-label:hover .folder-edit__swatch {
	transform: scale(1.1);
}

.folder-edit__swatch-label--selected .folder-edit__swatch {
	border-color: var(--color-ink);
	transform: scale(1.05);
}

.folder-edit__swatch-input:focus-visible + .folder-edit__swatch {
	box-shadow: var(--ring-focus);
}

.folder-edit__table-list {
	max-height: 18rem;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
}

.folder-edit__table {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-2);
	padding: var(--space-1) 0;
}

.folder-edit__table-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
