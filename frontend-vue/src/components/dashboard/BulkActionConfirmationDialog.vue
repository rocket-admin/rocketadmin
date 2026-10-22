<script setup lang="ts">
// Port of db-table-view/db-bulk-action-confirmation-dialog (BbBulkActionConfirmationDialogComponent):
// confirms a custom action that requires confirmation, or deleting rows, listing the rows by their
// identity field (or primary key). With an action `id` it activates that action — and shows the
// link dialog when the action answers with a location; without one it deletes the row (one key)
// or the rows (several). Closes with `true` once the request succeeded (the row edit page then
// goes back to the table) and without a result when it failed — Angular closed on both.
import { computed, ref } from 'vue';
import AppDialog from '@/components/dialog/AppDialog.vue';
import { UiButton } from '@/components/ui';
import { useDialog, useDialogRef } from '@/composables/useDialog';
import { useConnectionsStore } from '@/stores/connections';
import { type RowKeyParams, useTableRowStore } from '@/stores/table-row';
import { useTablesStore } from '@/stores/tables';
import ActionLinkDialog from './ActionLinkDialog.vue';
import type { BulkActionConfirmationData } from './types';

const props = defineProps<{ data: BulkActionConfirmationData }>();

const dialogRef = useDialogRef<boolean>();
const dialog = useDialog();
const connections = useConnectionsStore();
const tables = useTablesStore();
const tableRow = useTableRowStore();

const submitting = ref(false);
const title = computed(() => `Confirm ${props.data.title.toLowerCase()} for ${props.data.tableDisplayName} table`);

function onActionsComplete(succeeded: boolean) {
	dialogRef.close(succeeded || undefined);
	submitting.value = false;
}

async function handleConfirmedActions() {
	submitting.value = true;
	const connectionID = connections.currentConnectionID ?? '';
	const tableName = tables.currentTableName ?? '';
	const { id, primaryKeys } = props.data;

	try {
		if (id) {
			const res = (await tables.activateActions(connectionID, tableName, id, props.data.title, primaryKeys)) as {
				location?: string;
			} | null;
			onActionsComplete(true);
			if (res?.location) {
				dialog.open(ActionLinkDialog, {
					data: { href: res.location, actionName: props.data.title, primaryKeys: primaryKeys[0] },
				});
			}
			return;
		}
		if (primaryKeys.length === 1) {
			await tableRow.deleteTableRow(connectionID, tableName, (primaryKeys[0] ?? {}) as RowKeyParams);
		} else if (primaryKeys.length > 1) {
			await tables.bulkDelete(connectionID, tableName, primaryKeys);
		}
	} catch {
		// The store has shown the error.
		onActionsComplete(false);
		return;
	}
	onActionsComplete(true);
}
</script>

<template>
	<AppDialog :title="title" size="sm" :dismissible="!submitting" data-testid="bulk-action-confirm-dialog">
		<div v-if="data.identityFieldValues">
			<p class="bulk-confirm__lead">
				You are going to <strong class="bulk-confirm__action">{{ data.title }}</strong> for:
			</p>
			<ul class="bulk-confirm__list">
				<li v-for="(identityValue, index) in data.identityFieldValues" :key="index">
					<strong>{{ identityValue }}{{ index < data.identityFieldValues.length - 1 ? ',' : '.' }}</strong>
				</li>
			</ul>
		</div>
		<template v-else>
			<p class="bulk-confirm__lead">
				You are going to <strong class="bulk-confirm__action">{{ data.title }}</strong> with following primary
				key(s)
			</p>
			<ul class="bulk-confirm__list">
				<li v-for="(primaryKey, index) in data.primaryKeys" :key="index">
					<strong v-for="(entry, attributeIndex) in Object.entries(primaryKey)" :key="entry[0]">
						{{ entry[0] }} = {{ entry[1] }}<span v-if="attributeIndex < Object.keys(primaryKey).length - 1">,</span>
					</strong>
					<span>{{ index !== data.primaryKeys.length - 1 ? ';' : '.' }}</span>
				</li>
			</ul>
		</template>
		<p class="bulk-confirm__lead">Please confirm.</p>

		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton
				variant="danger"
				:loading="submitting"
				data-testid="bulk-action-confirm-button"
				@click="handleConfirmedActions"
			>
				{{ data.title }}
			</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.bulk-confirm__lead {
	margin: 0 0 var(--space-3);
}

.bulk-confirm__action {
	text-transform: lowercase;
}

.bulk-confirm__list {
	margin: 0 0 var(--space-4);
	padding: 0;
	list-style: none;
}
</style>
