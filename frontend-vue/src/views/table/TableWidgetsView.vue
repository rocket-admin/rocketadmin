<script setup lang="ts">
// Port of frontend/src/app/components/dashboard/db-table-view/db-table-widgets: the table's UI
// widgets (`/dashboard/:connectionId/:tableName/widgets`). One row per widget; a column can carry
// at most one, so the column picker offers only the columns without a widget. Saving posts the whole
// list and goes back to the table; deleting one (or all) saves right away and stays here.
//
// Widgets saved without a type come back as `''` and are shown as "Default"; "Default" is sent back
// as `''`.
import { difference } from 'lodash-es';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppBreadcrumbs from '@/components/shared/AppBreadcrumbs.vue';
import PlaceholderTableWidgets from '@/components/skeletons/PlaceholderTableWidgets.vue';
import { trackTableEvent } from '@/components/table/analytics';
import TableWidgetItem from '@/components/table/TableWidgetItem.vue';
import WidgetDeleteDialog from '@/components/table/WidgetDeleteDialog.vue';
import WidgetsEmptyState from '@/components/table/WidgetsEmptyState.vue';
import { NO_SETTINGS, WIDGET_DEFAULT_PARAMS, WIDGETS_WITH_SETTINGS } from '@/components/table/widget-defaults';
import { UiButton, UiIcon, UiIconButton } from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import { UIwidgets } from '@/consts/record-edit-types';
import { normalizeTableName } from '@/lib/normalize';
import type { Widget } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { type TableStructureResponse, useTablesStore } from '@/stores/tables';

const route = useRoute();
const router = useRouter();
const connections = useConnectionsStore();
const tables = useTablesStore();
const dialog = useDialog();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const tableName = computed(() => String(route.params.tableName ?? ''));

const widgetTypes = Object.keys(UIwidgets).sort();

/** Columns without a widget, offered by the column picker. */
const fields = ref<string[]>([]);
const fieldsCount = ref(0);
/** null until loaded. */
const widgets = ref<Widget[] | null>(null);
const displayTableName = ref('');
const submitting = ref(false);

const widgetList = computed(() => widgets.value ?? []);
const tablePath = computed(() => `/dashboard/${connectionId.value}/${tableName.value}`);

const crumbs = computed(() => {
	const connection = connections.currentConnection;
	return [
		{ label: connection.title || connection.database, link: `/dashboard/${connectionId.value}` },
		{ label: displayTableName.value, link: tablePath.value },
		{ label: 'UI Widgets', link: null },
	];
});

onMounted(async () => {
	let res: TableStructureResponse;
	try {
		res = await tables.fetchTableStructure(connectionId.value, tableName.value);
	} catch {
		return;
	}
	fieldsCount.value = res.structure.length;
	fields.value = res.structure.map((field) => field.column_name);
	displayTableName.value = (res.display_name as string | undefined) || normalizeTableName(tableName.value);
	document.title = `${displayTableName.value} - Field display | Rocketadmin`;
	await getWidgets();
});

async function getWidgets() {
	let res: Widget[];
	try {
		res = await tables.fetchTableWidgets(connectionId.value, tableName.value);
	} catch {
		return;
	}
	fields.value = difference(
		fields.value,
		res.map((widget) => widget.field_name),
	);
	widgets.value = res.map((widget) => (widget.widget_type === '' ? { ...widget, widget_type: 'Default' } : widget));
}

function isReadOnly(type: string) {
	return !WIDGETS_WITH_SETTINGS.includes(type);
}

function addNewWidget() {
	widgets.value?.push({
		field_name: '',
		widget_type: 'Default',
		widget_params: NO_SETTINGS,
		name: '',
		description: '',
	});
}

function trackAddWidget() {
	trackTableEvent('Widgets: add widget is clicked');
	addNewWidget();
}

function selectWidgetField(index: number, field: string) {
	const widget = widgets.value?.[index];
	if (!widget) return;
	widget.field_name = field;
	fields.value = fields.value.filter((name) => name !== field);
}

function widgetTypeChange(index: number, type: string) {
	const widget = widgets.value?.[index];
	if (!widget) return;
	widget.widget_type = type;
	widget.widget_params = WIDGET_DEFAULT_PARAMS[type || 'Default'] ?? NO_SETTINGS;
}

function widgetParamsChange(index: number, value: string) {
	const widget = widgets.value?.[index];
	if (widget) widget.widget_params = value;
}

function updateWidget(index: number, patch: Partial<Widget>) {
	const widget = widgets.value?.[index];
	if (widget) Object.assign(widget, patch);
}

async function openDeleteWidgetDialog(widgetFieldName: string) {
	const action = await dialog.open<'delete'>(WidgetDeleteDialog, { data: widgetFieldName }).afterClosed();
	if (action !== 'delete' || !widgets.value) return;
	fields.value = [...fields.value, widgetFieldName];
	widgets.value = widgets.value.filter((widget) => widget.field_name !== widgetFieldName);
	await updateWidgets(true);
}

async function openClearAllConfirmation() {
	const action = await dialog.open<'delete'>(WidgetDeleteDialog).afterClosed();
	if (action !== 'delete' || !widgets.value) return;
	fields.value = [...fields.value, ...widgets.value.map((widget) => widget.field_name)];
	widgets.value = [];
	await updateWidgets(true);
}

async function updateWidgets(afterDeleteAll = false) {
	if (!widgets.value) return;
	submitting.value = true;
	const payload = widgets.value.map((widget) =>
		widget.widget_type === 'Default' ? { ...widget, widget_type: '' } : { ...widget },
	);
	try {
		await tables.updateTableWidgets(connectionId.value, tableName.value, payload);
		trackTableEvent('Widgets: widgets are updated successfully');
		if (!afterDeleteAll) router.push(tablePath.value);
	} catch {
		// Reported by the store.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="table-widgets">
		<AppAlert class="table-widgets__alert" />
		<PlaceholderTableWidgets v-if="!widgets" />

		<div v-else class="table-widgets__wrapper">
			<header class="table-widgets__header">
				<div class="table-widgets__mobile-header">
					<UiIconButton icon="arrow_back" label="Back to table" :to="tablePath" />
					<div class="table-widgets__mobile-titles">
						<h1 class="table-widgets__mobile-title">Widgets</h1>
						<span class="table-widgets__mobile-subtitle">{{ tableName }}</span>
					</div>
				</div>
				<AppBreadcrumbs :crumbs="crumbs" class="table-widgets__breadcrumbs" />

				<div v-if="widgets.length" class="table-widgets__header-actions-box">
					<div class="table-widgets__header-actions">
						<UiButton
							variant="secondary"
							:disabled="fields.length === 0 && widgets.length === 0"
							data-testid="widgets-clear-all-button"
							@click="openClearAllConfirmation"
						>
							Clear All
						</UiButton>
						<UiButton
							variant="secondary"
							:disabled="fields.length === 0 || widgets.length === fieldsCount"
							data-testid="widgets-add-button"
							@click="trackAddWidget"
						>
							<template #leading><UiIcon name="add" /></template>
							Add UI widget
						</UiButton>
					</div>
					<div class="table-widgets__header-links">
						<UiButton
							variant="ghost"
							href="https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_definition"
							target="_blank"
							rel="noopener noreferrer"
						>
							What are UI Widgets
							<template #trailing><UiIcon name="open_in_new" size="sm" /></template>
						</UiButton>
						<UiButton
							variant="ghost"
							href="https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management"
							target="_blank"
							rel="noopener noreferrer"
						>
							How to manage UI Widgets
							<template #trailing><UiIcon name="open_in_new" size="sm" /></template>
						</UiButton>
					</div>
				</div>
			</header>

			<form v-if="widgetList.length" class="table-widgets__form" novalidate @submit.prevent="updateWidgets()">
				<div class="table-widgets__grid">
					<TableWidgetItem
						v-for="(widget, index) in widgetList"
						:key="index"
						:index="index"
						:widget="widget"
						:fields="fields"
						:widget-types="widgetTypes"
						:is-readonly-params="isReadOnly(widget.widget_type)"
						@select-field="selectWidgetField(index, $event)"
						@type-change="widgetTypeChange(index, $event)"
						@params-change="widgetParamsChange(index, $event)"
						@update="updateWidget(index, $event)"
						@delete="openDeleteWidgetDialog(widget.field_name)"
					/>
				</div>

				<div class="table-widgets__actions">
					<UiButton variant="secondary" :to="tablePath" class="table-widgets__back">Back</UiButton>
					<UiButton type="submit" :disabled="submitting" data-testid="widgets-save-button">Save</UiButton>
				</div>
			</form>

			<template v-else>
				<WidgetsEmptyState @add-widget="addNewWidget" />
				<div class="table-widgets__actions table-widgets__actions--empty">
					<UiButton variant="secondary" :to="tablePath">Back</UiButton>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.table-widgets {
	padding: 0 var(--space-4);
}

.table-widgets__alert {
	margin-top: var(--space-6);
}

.table-widgets__wrapper {
	width: 90%;
	min-width: 18.75rem;
	margin: 0 auto;
}

.table-widgets__header {
	display: flex;
	justify-content: space-between;
	gap: var(--space-4);
	margin: var(--space-10) 0 var(--space-6);
}

.table-widgets__mobile-header {
	display: none;
}

.table-widgets__header-actions-box {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--space-4);
}

.table-widgets__header-actions,
.table-widgets__header-links {
	display: flex;
	gap: var(--space-4);
}

.table-widgets__grid {
	display: grid;
	grid-template-columns: minmax(10%, 8rem) 1fr 2fr 1fr 2fr 3rem;
	align-items: start;
	gap: var(--space-5);
}

.table-widgets__actions {
	position: sticky;
	bottom: 0;
	display: flex;
	justify-content: space-between;
	margin-top: var(--space-6);
	padding: var(--space-3) 0;
	border-top: 1px solid var(--color-line);
	background: var(--color-paper);
}

@media (width <= 600px) {
	.table-widgets__wrapper {
		width: 100%;
		min-width: 0;
	}

	.table-widgets__breadcrumbs,
	.table-widgets__back,
	.table-widgets__actions--empty {
		display: none;
	}

	.table-widgets__mobile-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.table-widgets__mobile-titles {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.table-widgets__mobile-title {
		margin: 0;
		font-size: var(--text-md);
		font-weight: var(--weight-semibold);
	}

	.table-widgets__mobile-subtitle {
		overflow: hidden;
		font-size: var(--text-xs);
		color: var(--color-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.table-widgets__header {
		flex-direction: column;
		margin: var(--space-4) 0;
	}

	.table-widgets__header-actions-box {
		align-items: stretch;
		gap: var(--space-2);
	}

	.table-widgets__header-actions {
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.table-widgets__header-links {
		flex-direction: column;
		align-items: flex-start;
		gap: 0;
	}

	.table-widgets__grid {
		display: flex;
		flex-direction: column;
	}

	.table-widgets__actions {
		justify-content: flex-end;
	}
}
</style>
