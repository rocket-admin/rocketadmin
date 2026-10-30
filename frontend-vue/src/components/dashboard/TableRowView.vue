<script setup lang="ts">
// Port of db-table-view/db-table-row-view (DbTableRowViewComponent): the "Preview" side panel of
// the row selected in the table view (or of the row a foreign-key cell points at). It lists the
// row's fields through the record-view widgets, its "Related records" in other tables, and links
// to copy or open the record's own page. On phones it is a bottom sheet over a backdrop.
//
// The selected row is the table-state store's `selectedRow` (the Angular `cast`); the logic lives
// in useRowView.
import { type Component, computed } from 'vue';
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router';
import ForeignKeyRecordView from '@/components/fields/record-view/ForeignKeyRecordView.vue';
import PlaceholderRecordView from '@/components/skeletons/PlaceholderRecordView.vue';
import { UiAccordion, UiExpansionPanel, UiIconButton, UiList, UiListItem, UiSpinner, vTooltip } from '@/components/ui';
import { useNotify } from '@/composables/useNotify';
import {
	getDedicatedPageLink,
	getDedicatedPageLinkParams,
	getForeignKeyQueryParams,
	getForeignKeyValue,
	type ReferencedRecords,
	rowViewColumns,
	useRelatedRecords,
} from '@/composables/useRowView';
import { recordViewFieldTypes, UIwidgets } from '@/consts/record-view-types';
import { copyToClipboard } from '@/lib/clipboard';
import { useConnectionsStore } from '@/stores/connections';
import { useTableStateStore } from '@/stores/table-state';
import { stashBackUrl } from './backUrl';

const props = defineProps<{
	/** The table view's filters, stashed for the row page's "back" link. */
	activeFilters?: object | null;
}>();

type WidgetMap = Record<string, Component | string | undefined>;

const tableState = useTableStateStore();
const connections = useConnectionsStore();
const notify = useNotify();
const route = useRoute();
const router = useRouter();

const selectedRow = computed(() => tableState.selectedRow);
const columns = computed(() => (selectedRow.value ? rowViewColumns(selectedRow.value) : []));
const related = useRelatedRecords(selectedRow);

const recordViewComponents = computed<WidgetMap>(
	() => (recordViewFieldTypes as Record<string, WidgetMap>)[connections.connection.type] ?? {},
);
const widgetComponents = UIwidgets as WidgetMap;

const hasRelated = computed(() => !!selectedRow.value?.relatedRecords?.referenced_by?.length);

function isForeignKey(column: string): boolean {
	return !!selectedRow.value?.foreignKeysList?.includes(column);
}

/** The widget configured for the column, when it has a type with a record-view component. */
function widgetComponent(column: string): Component | null {
	const row = selectedRow.value;
	if (!row?.widgetsList?.includes(column)) return null;
	const type = row.widgets?.[column]?.widget_type;
	return (type && (widgetComponents[type] as Component | undefined)) || null;
}

function typeComponent(column: string): Component | null {
	const type = selectedRow.value?.fieldsTypes?.[column];
	return (type && (recordViewComponents.value[type] as Component | undefined)) || null;
}

function foreignKeyDisplayValue(column: string): string | number | null {
	return getForeignKeyValue(selectedRow.value, column) as string | number | null;
}

function foreignKeyLink(column: string): string {
	const row = selectedRow.value;
	return `/dashboard/${row?.connectionID}/${row?.foreignKeys?.[column]?.referenced_table_name}/entry`;
}

/** These links open in a new tab, as the Angular `target="_blank"` routerLinks did. */
function newTabHref(path: string, query?: LocationQueryRaw): string {
	return router.resolve({ path, query }).href;
}

/** One expansion panel per referencing table; `records` stays undefined while they load. */
const relatedPanels = computed(() =>
	related.tables.value.map((table, index) => ({
		table,
		records: related.records[table.table_name] as ReferencedRecords | undefined,
		urlParams: related.urlParams.value[index],
	})),
);

function isEmpty(records: ReferencedRecords | undefined): boolean {
	return !!records && !records.rows.length;
}

async function copyLink() {
	if (await copyToClipboard(getDedicatedPageLink(selectedRow.value))) {
		notify.success('Link to this record was copied to clipboard.', 'top');
	}
}

function showCopyNotification(message: string) {
	notify.success(message, 'top');
}

function stashUrlParams() {
	stashBackUrl(route.query, props.activeFilters);
	tableState.clearSelection();
}

function handleClose() {
	tableState.clearSelection();
}
</script>

<template>
	<template v-if="selectedRow">
		<div class="row-view__backdrop" @click="handleClose" />
		<aside class="row-view" aria-label="Preview" data-testid="row-preview">
			<div class="row-view__handle" aria-hidden="true" />
			<header class="row-view__header">
				<h2 class="row-view__title">Preview</h2>
				<div class="row-view__actions">
					<template v-if="selectedRow.link">
						<UiIconButton icon="link" label="Copy link to this record" @click="copyLink" />
						<UiIconButton
							icon="create"
							label="Open the record"
							:to="{ path: selectedRow.link, query: getDedicatedPageLinkParams(selectedRow) as Record<string, string> }"
							@click="stashUrlParams"
						/>
					</template>
				</div>
				<UiIconButton icon="close" label="Close" @click="handleClose" />
			</header>

			<section v-if="hasRelated" class="row-view__related">
				<h3 class="row-view__related-title">Related records</h3>

				<UiAccordion multi>
					<UiExpansionPanel
						v-for="panel in relatedPanels"
						:key="panel.table.table_name"
						:disabled="isEmpty(panel.records)"
						:hide-toggle="isEmpty(panel.records)"
						class="row-view__related-panel"
					>
						<template #title>
							<span v-tooltip="panel.table.displayTableName" class="row-view__related-name">
								{{ panel.table.displayTableName }}
							</span>
							<span v-if="isEmpty(panel.records)" class="row-view__empty-mark">Empty</span>
						</template>
						<template #actions>
							<UiSpinner v-if="!panel.records" size="sm" label="Loading" />
							<template v-else>
								<UiIconButton
									icon="add"
									size="sm"
									:label="`Add a new record to ${panel.table.displayTableName}`"
									:href="newTabHref(`/dashboard/${selectedRow.connectionID}/${panel.table.table_name}/entry`)"
									target="_blank"
									@click="handleClose"
								/>
								<UiIconButton
									icon="open_in_new"
									size="sm"
									label="Open records in table view"
									:href="newTabHref(`/dashboard/${selectedRow.connectionID}/${panel.table.table_name}`, panel.urlParams)"
									target="_blank"
									@click="handleClose"
								/>
							</template>
						</template>

						<UiList v-if="panel.records" size="sm">
							<UiListItem
								v-for="(row, rowIndex) in panel.records.rows"
								:key="rowIndex"
								class="row-view__related-record"
							>
								<span>
									<strong v-if="!panel.records.identityColumn.isSet">
										{{ panel.records.identityColumn.displayName }}:&nbsp;
									</strong>
									{{ row[panel.records.identityColumn.fieldName] }}
								</span>
								<template #description>
									<span v-for="field in panel.records.fieldsOrder" :key="field.fieldName">
										<strong>{{ field.displayName }}:</strong>
										{{ row[field.fieldName] || '—' }};
									</span>
								</template>
								<template #trailing>
									<UiIconButton
										icon="chevron_right"
										size="sm"
										label="Open record"
										:to="{
											path: `/dashboard/${selectedRow.connectionID}/${panel.table.table_name}/entry`,
											query: panel.records.links[rowIndex] as Record<string, string>,
										}"
										@click="handleClose"
									/>
								</template>
							</UiListItem>
						</UiList>
					</UiExpansionPanel>
				</UiAccordion>
			</section>

			<div v-if="selectedRow.record" class="row-view__fields">
				<div v-for="column in columns" :key="column.title" class="row-view__field">
					<strong class="row-view__label">{{ column.normalizedTitle }}</strong>
					<div class="row-view__value ph-no-capture">
						<ForeignKeyRecordView
							v-if="isForeignKey(column.title)"
							:link="foreignKeyLink(column.title)"
							:primary-keys-params="getForeignKeyQueryParams(selectedRow, column.title)"
							:display-value="foreignKeyDisplayValue(column.title)"
							@foreign-key-click="handleClose"
						/>
						<component
							:is="widgetComponent(column.title)"
							v-else-if="widgetComponent(column.title)"
							:field-key="column.title"
							:value="selectedRow.record[column.title]"
							:widget-structure="selectedRow.widgets?.[column.title]"
							:row-data="selectedRow.record"
							:primary-keys="selectedRow.primaryKeys"
							@copy-to-clipboard="showCopyNotification"
						/>
						<component
							:is="typeComponent(column.title)"
							v-else-if="typeComponent(column.title)"
							:field-key="column.title"
							:value="selectedRow.record[column.title]"
							@copy-to-clipboard="showCopyNotification"
						/>
					</div>
				</div>
			</div>
			<PlaceholderRecordView v-else />
		</aside>
	</template>
</template>

<style scoped>
.row-view {
	position: relative;
	flex-shrink: 0;
	width: clamp(200px, 22vw, 400px);
	max-height: calc(100vh - var(--header-height));
	overflow-y: auto;
	border-inline-start: 1px solid var(--color-line);
	background: var(--color-surface);
}

.row-view__backdrop,
.row-view__handle {
	display: none;
}

.row-view__header {
	position: sticky;
	top: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-1);
	padding: var(--space-5) var(--space-3) var(--space-5) var(--space-5);
	background: inherit;
}

.row-view__title {
	margin: 0;
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
}

.row-view__actions {
	display: flex;
	margin-inline-start: auto;
}

.row-view__related {
	padding: 0 var(--space-5) var(--space-4);
}

.row-view__related-title {
	margin: 0 0 var(--space-2);
	color: var(--color-ink-soft);
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
}

.row-view__related-panel :deep(.ui-expansion-panel__toggle) {
	padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
}

.row-view__related-panel :deep(.ui-expansion-panel__title) {
	font-size: var(--text-sm);
}

.row-view__related-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.row-view__empty-mark {
	flex: none;
	margin-inline-start: var(--space-2);
	padding: 0 var(--space-2);
	border-radius: var(--radius-pill);
	font-size: var(--text-2xs);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-muted);
	background: var(--color-paper-2);
}

.row-view__fields {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	padding: 0 var(--space-5) var(--space-5);
}

.row-view__field {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
}

.row-view__label {
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
}

@media (width <= 600px) {
	.row-view__backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-overlay);
		display: block;
		background: var(--color-overlay);
	}

	.row-view {
		position: fixed;
		inset: auto 0 0;
		z-index: var(--z-modal);
		width: 100vw;
		max-height: 80vh;
		border-inline-start: 0;
		border-radius: var(--radius-panel) var(--radius-panel) 0 0;
		box-shadow: var(--shadow-lift);
	}

	.row-view__handle {
		display: block;
		width: 2.25rem;
		height: 4px;
		margin: var(--space-2) auto 0;
		border-radius: var(--radius-pill);
		background: var(--color-line-strong);
	}
}
</style>
