<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/panel-edit-dialog: adds a panel (a saved query) to
// a dashboard, or swaps the query of an existing one, and closes with `true` so the dashboard
// reloads. "Create new query" leaves for the panel editor instead.
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppDialog from '@/components/dialog/AppDialog.vue';
import AppDialogForm from '@/components/dialog/AppDialogForm.vue';
import { type SelectOption, UiButton, UiField, UiIcon, UiSelect } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import type { DashboardWidget } from '@/models/dashboard';
import { useDashboardsStore } from '@/stores/dashboards';
import { useSavedQueriesQuery } from '@/stores/saved-queries';
import { type SelectModel, selected } from '../charts/chartEditor';
import { trackDashboardsEvent } from './analytics';

/** The "Create new query" entry of the select (a `mat-option` with a click handler in Angular). */
const CREATE_QUERY = '__create_query__';

const props = defineProps<{
	data: { connectionId: string; dashboardId: string; widget: DashboardWidget | null };
}>();

const dialogRef = useDialogRef<boolean>();
const router = useRouter();
const dashboards = useDashboardsStore();
const { savedQueries } = useSavedQueriesQuery(() => props.data.connectionId);

const isEdit = !!props.data.widget;
const queryId = ref<string>(props.data.widget?.query_id || '');
const touched = ref(false);
const submitting = ref(false);

const options = computed<SelectOption<string>[]>(() => [
	...savedQueries.value.map((query) => ({ value: query.id, label: query.name })),
	{ value: CREATE_QUERY, label: '+ Create new query' },
]);
const queryError = computed(() => (touched.value && !queryId.value ? 'Please select a saved query' : undefined));
const newQueryPath = computed(() => `/panels/${props.data.connectionId}/new`);

function onSelect(value: SelectModel<string>): void {
	const choice = selected(value);
	touched.value = true;
	if (choice === CREATE_QUERY) {
		navigateToCreateQuery();
		return;
	}
	queryId.value = choice ?? '';
}

async function onSubmit(): Promise<void> {
	if (!queryId.value) return;

	submitting.value = true;
	try {
		const widget = props.data.widget;
		if (widget) {
			const result = await dashboards.updateWidget(props.data.connectionId, props.data.dashboardId, widget.id, {
				query_id: queryId.value,
			});
			if (result) {
				trackDashboardsEvent('Dashboards: panel updated successfully');
				dialogRef.close(true);
			}
		} else {
			const result = await dashboards.createWidget(props.data.connectionId, props.data.dashboardId, {
				query_id: queryId.value,
				position_x: 0,
				position_y: 0,
				width: 4,
				height: 4,
			});
			if (result) {
				trackDashboardsEvent('Dashboards: panel created successfully');
				dialogRef.close(true);
			}
		}
	} catch {
		// The client has shown the error.
	} finally {
		submitting.value = false;
	}
}

function navigateToCreateQuery(): void {
	dialogRef.close();
	router.push(newQueryPath.value);
}
</script>

<template>
	<AppDialogForm
		v-if="savedQueries.length > 0"
		:title="isEdit ? 'Edit panel' : 'Add panel'"
		:submit-label="submitting ? 'Saving...' : isEdit ? 'Update' : 'Add'"
		:busy="submitting"
		:disabled="!queryId"
		@submit="onSubmit"
	>
		<div class="panel-form">
			<UiField
				label="Saved query"
				hint="Select a saved query to display in this panel"
				:error="queryError"
				required
			>
				<UiSelect
					:model-value="queryId || null"
					:options="options"
					placeholder=""
					data-testid="panel-query-select"
					@update:model-value="onSelect"
				/>
			</UiField>
		</div>
	</AppDialogForm>

	<AppDialog v-else :title="isEdit ? 'Edit panel' : 'Add panel'">
		<div class="panel-form__empty">
			<UiIcon name="code" size="lg" class="panel-form__empty-icon" />
			<h3 class="panel-form__empty-title">No saved queries yet</h3>
			<p class="panel-form__empty-text">Create a saved query first to add it as a panel on this dashboard.</p>
			<UiButton variant="secondary" :to="newQueryPath" @click="dialogRef.close()">
				<template #leading><UiIcon name="add" size="sm" /></template>
				Create query
			</UiButton>
		</div>
		<template #footer>
			<UiButton variant="secondary" @click="dialogRef.close()">Cancel</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.panel-form {
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	min-width: min(400px, 100%);
	padding-top: var(--space-2);
}

.panel-form__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--space-6);
	text-align: center;
}

.panel-form__empty-icon {
	margin-bottom: var(--space-4);
	color: var(--color-muted-soft);
}

.panel-form__empty-title {
	margin: 0 0 var(--space-2);
	font-size: var(--text-md);
	font-weight: var(--weight-medium);
}

.panel-form__empty-text {
	margin: 0 0 var(--space-5);
	font-size: var(--text-sm);
	color: var(--color-muted);
}
</style>
