<script setup lang="ts">
// Port of frontend/src/app/components/secrets/audit-log-dialog: the paged list of who created,
// viewed, copied, updated or deleted a secret, and whether it succeeded.
import { onMounted, ref } from 'vue';
import AppDialog from '@/components/dialog/AppDialog.vue';
import {
	type PageEvent,
	type TableColumn,
	UiButton,
	UiIcon,
	UiPaginator,
	UiSpinner,
	UiTable,
	vTooltip,
} from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { AuditLogEntry, Secret, SecretAction } from '@/models/secret';
import { useSecretsStore } from '@/stores/secrets';
import { formatMediumDateTime } from './secretUtils';

export interface SecretAuditLogDialogData {
	secret: Secret;
}

const props = defineProps<{ data: SecretAuditLogDialogData }>();

const ACTION_LABELS: Record<SecretAction, string> = {
	create: 'Created',
	view: 'Viewed',
	copy: 'Copied',
	update: 'Updated',
	delete: 'Deleted',
};

const ACTION_ICONS: Record<SecretAction, string> = {
	create: 'add_circle',
	view: 'visibility',
	copy: 'content_copy',
	update: 'edit',
	delete: 'delete',
};

const columns: TableColumn<AuditLogEntry>[] = [
	{ key: 'action', label: 'Action' },
	{ key: 'user', label: 'User' },
	{ key: 'accessedAt', label: 'Time' },
	{ key: 'success', label: 'Status' },
];

const dialogRef = useDialogRef<void>();
const secrets = useSecretsStore();

const logs = ref<AuditLogEntry[]>([]);
const total = ref(0);
const currentPage = ref(1);
const perPage = ref(20);
const loading = ref(true);

onMounted(loadAuditLog);

async function loadAuditLog() {
	loading.value = true;
	try {
		const response = await secrets.getAuditLog(props.data.secret.slug, currentPage.value, perPage.value);
		logs.value = response.data;
		total.value = response.pagination.total;
		currentPage.value = response.pagination.currentPage;
		perPage.value = response.pagination.perPage;
	} catch {
		// The store has shown the error.
	} finally {
		loading.value = false;
	}
}

function onPageChange(event: PageEvent) {
	currentPage.value = event.pageIndex + 1;
	perPage.value = event.pageSize;
	loadAuditLog();
}
</script>

<template>
	<AppDialog :title="`Audit Log: ${data.secret.slug}`" size="lg" data-testid="secret-audit-log-dialog">
		<div class="audit-log">
			<div v-if="loading" class="audit-log__loading">
				<UiSpinner size="lg" />
				<p>Loading audit log...</p>
			</div>

			<div v-else-if="logs.length === 0" class="audit-log__empty">
				<UiIcon name="history_toggle_off" size="lg" class="audit-log__empty-icon" />
				<h3 class="audit-log__empty-title">No audit log entries</h3>
				<p class="audit-log__empty-text">No actions have been recorded for this secret yet.</p>
			</div>

			<template v-else>
				<UiTable
					:columns="columns"
					:rows="logs"
					row-key="id"
					label="Audit log"
					size="sm"
					:row-class="(log) => ({ 'audit-log__row--failed': !log.success })"
					class="audit-log__table"
				>
					<template #cell-action="{ row }">
						<span :class="['audit-log__action', `audit-log__action--${row.action}`]">
							<UiIcon :name="ACTION_ICONS[row.action]" size="sm" />
							<span>{{ ACTION_LABELS[row.action] }}</span>
						</span>
					</template>
					<template #cell-user="{ row }">
						<span class="audit-log__email">{{ row.user.email }}</span>
					</template>
					<template #cell-accessedAt="{ row }">{{ formatMediumDateTime(row.accessedAt) }}</template>
					<template #cell-success="{ row }">
						<span v-if="row.success" v-tooltip="'Success'" class="audit-log__status audit-log__status--success">
							<UiIcon name="check_circle" label="Success" />
						</span>
						<span
							v-else
							v-tooltip="row.errorMessage || 'Failed'"
							class="audit-log__status audit-log__status--failure"
						>
							<UiIcon name="error" :label="row.errorMessage || 'Failed'" />
						</span>
					</template>
				</UiTable>

				<UiPaginator
					:length="total"
					:page-index="currentPage - 1"
					:page-size="perPage"
					:page-size-options="[10, 20, 50]"
					label="Audit log pages"
					@page="onPageChange"
				/>
			</template>
		</div>

		<template #footer>
			<UiButton variant="secondary" @click="dialogRef.close()">Close</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.audit-log {
	max-height: 60vh;
	overflow-y: auto;
}

.audit-log__loading,
.audit-log__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
}

.audit-log__loading {
	padding: var(--space-10);
	gap: var(--space-4);
}

.audit-log__loading p {
	margin: 0;
	color: var(--color-muted);
}

.audit-log__empty {
	padding: var(--space-12) var(--space-6);
}

.audit-log__empty-icon {
	margin-bottom: var(--space-4);
	color: var(--color-muted-soft);
}

.audit-log__empty-title {
	margin: 0 0 var(--space-2);
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.audit-log__empty-text {
	margin: 0;
	color: var(--color-muted);
}

.audit-log__action {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
}

.audit-log__action--create {
	color: var(--color-success);
}

.audit-log__action--view,
.audit-log__action--copy {
	color: var(--color-accent);
}

.audit-log__action--update {
	color: var(--color-warning);
}

.audit-log__action--delete {
	color: var(--color-danger);
}

.audit-log__email {
	font-size: var(--text-sm);
}

.audit-log__status {
	display: inline-flex;
}

.audit-log__status--success {
	color: var(--color-success);
}

.audit-log__status--failure {
	color: var(--color-danger);
}

.audit-log__table :deep(.audit-log__row--failed .ui-table__cell) {
	background: var(--color-danger-bg);
}
</style>
