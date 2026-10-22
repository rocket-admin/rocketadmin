<script setup lang="ts">
// Port of frontend/src/app/components/db-table-row-edit: the add / edit / duplicate / view row page
// (`/dashboard/:connectionId/:tableName/entry`). The logic lives in useRowEdit(); this renders the
// header (back, duplicate, delete, custom actions), the related records and the widget form.
//
// Each column is rendered by its record-edit widget: the table widget's type (consts UIwidgets) when
// one is configured, otherwise the column type's widget for the connection's database
// (recordEditTypes).
//
// Not ported here: the side row view (`app-db-table-row-view`) a related record opens in. Clicking
// one selects it in the table-state store (as Angular did); the panel belongs to the table view.
import { type Component, computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TableRowView from '@/components/dashboard/TableRowView.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppBanner from '@/components/shared/AppBanner.vue';
import PlaceholderRowEdit from '@/components/skeletons/PlaceholderRowEdit.vue';
import {
	UiAccordion,
	UiButton,
	UiExpansionPanel,
	UiIcon,
	UiIconButton,
	UiList,
	UiListItem,
	UiSpinner,
} from '@/components/ui';
import { type ReferencedRecords, TEST_CONNECTION_WARNING, useRowEdit } from '@/composables/useRowEdit';
import { recordEditTypes, UIwidgets } from '@/consts/record-edit-types';
import { type Alert, AlertType } from '@/models/alert';
import { useTableStateStore } from '@/stores/table-state';

const route = useRoute();
const router = useRouter();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const tableName = computed(() => String(route.params.tableName ?? ''));

const rowEdit = useRowEdit({ connectionId, tableName, router });
const tableState = useTableStateStore();
const {
	loading,
	isServerError,
	serverError,
	displayTableName,
	tableRowValues,
	tableRowStructure,
	tableRowRequiredValues,
	identityColumn,
	keyAttributesFromURL,
	hasKeyAttributesFromURL,
	dubURLParams,
	keyAttributesListFromStructure,
	tableTypes,
	tableWidgets,
	submitting,
	fieldsOrdered,
	rowActions,
	referencedTables,
	referencedRecords,
	referencedTablesURLParams,
	canDelete,
	pageAction,
	pageMode,
	backUrlParams,
	connectionType,
	isTestConnection,
	canEditRow,
	canAddRow,
	canDeleteRow,
	pageTitle,
	fieldsReadonly,
	tablePath,
	entryPath,
} = rowEdit;

const testConnectionWarning: Alert = { id: 10000000, type: AlertType.Error, message: TEST_CONNECTION_WARNING };

const widgetsByType = UIwidgets as Record<string, Component | ''>;
const inputsByDb = recordEditTypes as Record<string, Record<string, Component>>;

interface FormField {
	name: string;
	component: Component | null;
	hasDescription: boolean;
	props: Record<string, unknown>;
}

const formFields = computed<FormField[]>(() => {
	const values = tableRowValues.value ?? {};
	const inputs = inputsByDb[connectionType.value] ?? {};
	return fieldsOrdered.value.map((name, index) => {
		const widget = rowEdit.isWidget(name) ? tableWidgets.value[name] : undefined;
		const type = tableTypes.value[name];
		const component = widget?.widget_type ? widgetsByType[widget.widget_type] || null : (type && inputs[type]) || null;
		const props: Record<string, unknown> = {
			fieldKey: String(index),
			label: widget ? widget.name || name : name,
			value: values[name],
			required: tableRowRequiredValues.value[name],
			readonly: fieldsReadonly.value,
			disabled: rowEdit.isReadonlyField(name),
			structure: tableRowStructure.value[name],
			relations: type === 'foreign key' ? rowEdit.getRelations(name) : undefined,
		};
		if (widget) props.widgetStructure = widget;
		// Only the S3 widget reads the row's key (to preview the stored file).
		if (widget?.widget_type === 'S3') props.rowPrimaryKey = keyAttributesFromURL.value;
		return { name, component, hasDescription: !!widget?.description, props };
	});
});

const showKeyActions = computed(
	() => (keyAttributesListFromStructure.value.length > 0 || hasKeyAttributesFromURL.value) && !!canEditRow.value,
);

// The form's validity drives the submit buttons, like `editRowForm.form.invalid`. Widgets load
// lazily and keep their own constraints (required, custom validity), so the native form is asked
// whenever its content or values change.
const form = ref<HTMLFormElement | null>(null);
const formInvalid = ref(false);
let observer: MutationObserver | null = null;

function checkValidity() {
	nextTick(() => {
		formInvalid.value = form.value ? !form.value.checkValidity() : false;
	});
}

watch(form, (element) => {
	observer?.disconnect();
	if (!element) return;
	observer = new MutationObserver(checkValidity);
	observer.observe(element, { childList: true, subtree: true, attributes: true });
	checkValidity();
});
watch(tableRowValues, checkValidity, { deep: true, flush: 'post' });
onBeforeUnmount(() => observer?.disconnect());

watch(
	() => route.query,
	(query) => {
		// Leaving the page also changes the query; only load for this page.
		if (route.path !== entryPath.value) return;
		rowEdit.load(query);
	},
);
onMounted(() => rowEdit.load(route.query));

function onFieldChange(value: unknown, field: string) {
	rowEdit.updateField(value, field);
}

function recordsOf(table: string): ReferencedRecords | undefined {
	return referencedRecords.value[table];
}

function relatedIdentity(table: string, index: number): unknown {
	const records = referencedRecords.value[table];
	return records?.formattedRows[index]?.[records.identityColumn.name];
}

function relatedValue(table: string, index: number, field: string): unknown {
	return referencedRecords.value[table]?.formattedRows[index]?.[field];
}

function isEmptyRelated(table: string): boolean {
	const records = referencedRecords.value[table];
	return !!records && !records.rawRows.length;
}
</script>

<template>
	<div class="row-edit">
		<AppAlert class="row-edit__alert" />
		<AppAlert v-if="isTestConnection" :alert="testConnectionWarning" class="row-edit__alert" />
		<PlaceholderRowEdit v-if="loading" />

		<AppBanner v-if="isServerError && serverError" :type="AlertType.Error" class="row-edit__banner">
			<div v-if="serverError.details">
				<strong>{{ serverError.abstract }}</strong>
				<p class="row-edit__error-details">{{ serverError.details }}</p>
			</div>
			<p v-else class="row-edit__error">{{ serverError.abstract }}</p>
			<template #actions>
				<UiButton variant="secondary" :to="tablePath">Dashboard</UiButton>
			</template>
		</AppBanner>

		<div class="row-edit__page">
			<div
				v-if="tableRowValues"
				class="row-edit__wrapper"
				:class="{ 'row-edit__wrapper--shifted': tableState.selectedRow }"
			>
				<div class="row-edit__header">
					<div class="row-edit__header-main">
						<UiIconButton
							icon="arrow_back"
							label="Back to table"
							:to="{ path: tablePath, query: backUrlParams }"
							data-testid="record-back-to-table-button"
						/>
						<div class="row-edit__header-text">
							<h1 class="row-edit__title">{{ pageTitle }}</h1>
							<span class="row-edit__subtitle">{{ displayTableName }}</span>
						</div>
					</div>
					<div class="row-edit__row-actions">
						<UiIconButton
							v-if="canAddRow && hasKeyAttributesFromURL"
							icon="difference"
							label="Duplicate row"
							:to="{ path: entryPath, query: dubURLParams }"
							data-testid="record-duplicate-link"
						/>
						<UiIconButton
							v-if="canDeleteRow && canDelete && hasKeyAttributesFromURL"
							icon="delete"
							label="Delete row"
							data-testid="record-delete-button"
							@click="rowEdit.handleDeleteRow()"
						/>
						<template v-if="rowActions.length">
							<div class="row-edit__custom-actions row-edit__custom-actions--desktop">
								<UiIconButton
									v-for="action in rowActions"
									:key="action.id ?? action.title"
									:icon="action.icon"
									:label="action.title"
									@click="rowEdit.handleActivateAction(action)"
								/>
							</div>
							<div class="row-edit__custom-actions row-edit__custom-actions--mobile">
								<UiButton
									v-for="action in rowActions"
									:key="action.id ?? action.title"
									variant="secondary"
									@click="rowEdit.handleActivateAction(action)"
								>
									<template #leading><UiIcon :name="action.icon" /></template>
									{{ action.title }}
								</UiButton>
							</div>
						</template>
					</div>
				</div>

				<section v-if="referencedTables.length" class="row-edit__related" aria-labelledby="row-edit-related-title">
					<h2 id="row-edit-related-title" class="row-edit__related-title">
						Records related to&nbsp;
						<span v-if="identityColumn && tableRowValues[identityColumn]">"{{ tableRowValues[identityColumn] }}"</span>
						<span v-else>this row</span>
					</h2>

					<UiAccordion multi>
						<UiExpansionPanel
							v-for="(referencedTable, tableIndex) in referencedTables"
							:key="referencedTable.table_name"
							:disabled="isEmptyRelated(referencedTable.table_name)"
							:hide-toggle="isEmptyRelated(referencedTable.table_name)"
							class="row-edit__related-panel"
						>
							<template #title>
								<span class="row-edit__related-name">
									<span class="row-edit__related-name-text" :title="referencedTable.displayTableName">
										{{ referencedTable.displayTableName }}
									</span>
									<span v-if="isEmptyRelated(referencedTable.table_name)" class="row-edit__related-empty">Empty</span>
								</span>
							</template>
							<template #actions>
								<UiSpinner v-if="!recordsOf(referencedTable.table_name)" size="sm" label="Loading records" />
								<template v-else>
									<UiIconButton
										icon="add"
										size="sm"
										:label="`Add a new record to ${referencedTable.displayTableName}`"
										:href="router.resolve(`/dashboard/${connectionId}/${referencedTable.table_name}/entry`).href"
										target="_blank"
									/>
									<UiIconButton
										icon="open_in_new"
										size="sm"
										label="Open records in table view"
										:to="{
											path: `/dashboard/${connectionId}/${referencedTable.table_name}`,
											query: referencedTablesURLParams[tableIndex],
										}"
									/>
								</template>
							</template>

							<UiList v-if="recordsOf(referencedTable.table_name)" size="sm">
								<UiListItem
									v-for="(rawRow, rowIndex) in recordsOf(referencedTable.table_name)?.rawRows"
									:key="rowIndex"
									interactive
									class="row-edit__related-record"
									@click="rowEdit.handleViewRow(referencedTable.table_name, rawRow)"
								>
									<strong v-if="!recordsOf(referencedTable.table_name)?.identityColumn.isSet">
										{{ recordsOf(referencedTable.table_name)?.identityColumn.displayName }}:&nbsp;
									</strong>
									{{ relatedIdentity(referencedTable.table_name, rowIndex) }}
									<template #description>
										<span
											v-for="field in recordsOf(referencedTable.table_name)?.fieldsOrder"
											:key="field.fieldName"
											class="row-edit__related-field"
										>
											<strong class="row-edit__related-field-name">{{ field.displayName }}:</strong>
											<span>{{ relatedValue(referencedTable.table_name, rowIndex, field.fieldName) }};</span>
										</span>
									</template>
								</UiListItem>
							</UiList>
						</UiExpansionPanel>
					</UiAccordion>
				</section>

				<form
					ref="form"
					class="row-edit__form"
					novalidate
					@submit.prevent="rowEdit.handleRowSubmitting(false)"
					@input="checkValidity"
					@change="checkValidity"
				>
					<div class="row-edit__fields">
						<div
							v-for="field in formFields"
							:key="field.name"
							:class="['row-edit__field', { 'row-edit__field--widget': field.hasDescription }]"
							:data-testid="`record-field-${field.name}`"
						>
							<component
								:is="field.component"
								v-if="field.component"
								v-bind="field.props"
								@field-change="(value: unknown) => onFieldChange(value, field.name)"
							/>
						</div>
					</div>

					<div class="row-edit__actions">
						<UiButton
							v-if="showKeyActions && pageMode === 'view'"
							data-testid="switch-to-editing-button"
							@click="rowEdit.switchToEditMode()"
						>
							<template #leading><UiIcon name="edit" /></template>
							Edit
						</UiButton>

						<UiButton
							v-if="showKeyActions && pageMode !== 'view'"
							variant="ghost"
							class="row-edit__continue"
							data-testid="record-save-and-continue-editing-button"
							:disabled="submitting || formInvalid"
							@click="rowEdit.handleRowSubmitting(true)"
						>
							Save &amp; continue
						</UiButton>

						<UiButton
							v-if="hasKeyAttributesFromURL && canEditRow && !pageAction && pageMode !== 'view'"
							type="submit"
							data-testid="record-edit-button"
							:disabled="submitting || formInvalid"
						>
							Save
						</UiButton>

						<UiButton
							v-if="hasKeyAttributesFromURL && canAddRow && pageAction === 'dub'"
							type="submit"
							data-testid="record-duplicate-button"
							:disabled="submitting || formInvalid"
						>
							Duplicate
						</UiButton>

						<UiButton
							v-if="!hasKeyAttributesFromURL"
							type="submit"
							data-testid="record-add-button"
							:disabled="submitting || formInvalid"
						>
							Add
						</UiButton>
					</div>
				</form>
			</div>

			<!-- A related record opened from the side lists, as Angular's app-db-table-row-view here. -->
			<TableRowView v-if="tableState.selectedRow" :active-filters="null" />
		</div>
	</div>
</template>

<style scoped>
.row-edit {
	display: flex;
	flex-direction: column;
	min-height: 100%;
	padding: var(--space-4) var(--space-4) 0;
}

.row-edit__alert {
	margin-bottom: var(--space-6);
}

.row-edit__banner {
	margin: var(--space-6) auto;
}

.row-edit__error,
.row-edit__error-details {
	margin: var(--space-2) 0 0;
}

.row-edit__page {
	display: flex;
	flex: 1;
}

.row-edit__wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

/* Room for the related-record preview: the form narrows beside it (Angular's .wrapper_shifted). */
.row-edit__wrapper--shifted {
	min-width: 0;
}

.row-edit__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
	width: 100%;
	max-width: 32.5rem;
}

.row-edit__header-main {
	display: flex;
	align-items: center;
	gap: var(--space-1);
	min-width: 0;
}

.row-edit__header-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: var(--leading-tight);
}

.row-edit__title {
	margin: 0;
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.row-edit__subtitle {
	overflow: hidden;
	font-size: var(--text-xs);
	font-weight: var(--weight-medium);
	color: var(--color-muted);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.row-edit__row-actions {
	display: flex;
	align-items: center;
}

.row-edit__custom-actions {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.row-edit__custom-actions--mobile {
	display: none;
	flex-wrap: wrap;
	gap: var(--space-2);
}

.row-edit__related {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	width: 100%;
	max-width: 32.5rem;
	margin: var(--space-3) 0 var(--space-1);
}

.row-edit__related-title {
	margin: 0;
	font-size: var(--text-base);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.row-edit__related-name {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-width: 0;
}

.row-edit__related-name-text {
	overflow: hidden;
	min-width: 0;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.row-edit__related-empty {
	flex: none;
	padding: 0 var(--space-2);
	border-radius: var(--radius-pill);
	font-size: var(--text-2xs);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-muted);
	background: var(--color-paper-2);
}

.row-edit__related-field {
	margin-right: var(--space-2);
}

.row-edit__related-field-name {
	margin-right: var(--space-1);
}

.row-edit__form {
	display: flex;
	flex-direction: column;
	width: 100%;
	min-width: 18.75rem;
	max-width: 32.5rem;
	margin: var(--space-6) auto 0;
}

.row-edit__fields {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	padding-bottom: var(--space-10);
}

.row-edit__field {
	display: flex;
	flex-direction: column;
}

.row-edit__actions {
	position: sticky;
	bottom: 0;
	z-index: var(--z-sticky);
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--space-2);
	margin: 0 calc(-1 * var(--space-4));
	padding: var(--space-3) var(--space-4);
	border-top: 1px solid var(--color-line);
	background: var(--color-surface);
}

.row-edit__continue {
	margin-right: auto;
}

@media (width <= 600px) {
	.row-edit__custom-actions--desktop {
		display: none;
	}

	.row-edit__custom-actions--mobile {
		display: flex;
	}

	.row-edit__actions {
		flex-wrap: wrap;
	}
}
</style>
