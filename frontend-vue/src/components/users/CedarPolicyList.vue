<script setup lang="ts">
// Port of frontend/src/app/components/users/cedar-policy-list: the form mode of the policy editor.
// Lists the group's policy items by kind (General, Connection, Table, ...), edits them inline and
// adds new ones. `v-model:policies` carries the items; `v-model:adding` the add row, which the
// editor dialog's footer opens too.
import { computed, reactive, ref } from 'vue';
import AppContentLoader from '@/components/shared/AppContentLoader.vue';
import { UiButton, UiIcon, UiIconButton } from '@/components/ui';
import type { CedarPolicyItem } from '@/lib/cedar-policy-items';
import { actionIcon, actionLabel, actionShortLabel } from '@/lib/permission-display';
import { useUsersStore } from '@/stores/users';
import CedarPolicyItemForm from './CedarPolicyItemForm.vue';
import { buildDisplayGroups, buildFilteredGroups, groupPolicies, scopeResource } from './policyList';
import type { AvailableDashboard, AvailableTable } from './types';

const props = withDefaults(
	defineProps<{
		availableTables?: AvailableTable[];
		availableDashboards?: AvailableDashboard[];
		loading?: boolean;
	}>(),
	{ availableTables: () => [], availableDashboards: () => [], loading: false },
);

const policies = defineModel<CedarPolicyItem[]>('policies', { default: () => [] });
const adding = defineModel<boolean>('adding', { default: false });

const users = useUsersStore();

const newItem = reactive({ action: '', tableName: '', dashboardId: '' });
const editingIndex = ref<number | null>(null);
const editItem = reactive({ action: '', tableName: '', dashboardId: '' });
const collapsedGroups = ref(new Set<string>());

const displayGroups = computed(() => buildDisplayGroups(users.availablePermissionGroups));
const displayActions = computed(() => displayGroups.value.flatMap((group) => group.actions));
const groupedPolicies = computed(() => groupPolicies(policies.value));
const addActionGroups = computed(() => buildFilteredGroups(displayGroups.value, policies.value, -1));
const editActionGroups = computed(() =>
	buildFilteredGroups(displayGroups.value, policies.value, editingIndex.value ?? -1),
);

function usedBy(key: 'tableName' | 'dashboardId') {
	const map = new Map<string, string[]>();
	for (const policy of policies.value) {
		const id = policy[key];
		if (!id) continue;
		const labels = map.get(id) ?? [];
		labels.push(actionShortLabel(policy.action));
		map.set(id, labels);
	}
	return map;
}

const usedTables = computed(() => usedBy('tableName'));
const usedDashboards = computed(() => usedBy('dashboardId'));

function needsTable(action: string) {
	return scopeResource(displayActions.value, action) === 'table';
}

function needsDashboard(action: string) {
	return scopeResource(displayActions.value, action) === 'dashboard';
}

function tableDisplayName(tableName: string): string {
	if (tableName === '*') return 'All tables';
	return props.availableTables.find((table) => table.tableName === tableName)?.displayName || tableName;
}

function dashboardDisplayName(dashboardId: string): string {
	if (dashboardId === '*') return 'All dashboards';
	return props.availableDashboards.find((dashboard) => dashboard.id === dashboardId)?.name || dashboardId;
}

function toggleGroup(label: string) {
	const next = new Set(collapsedGroups.value);
	if (next.has(label)) next.delete(label);
	else next.add(label);
	collapsedGroups.value = next;
}

function addPolicy() {
	const { action, tableName, dashboardId } = newItem;
	if (!action) return;
	const scopedToTable = needsTable(action);
	const scopedToDashboard = needsDashboard(action);
	if (scopedToTable && !tableName) return;
	if (scopedToDashboard && !dashboardId) return;

	const duplicate = policies.value.some((policy) => {
		if (policy.action !== action) return false;
		if (scopedToTable) return policy.tableName === tableName;
		if (scopedToDashboard) return policy.dashboardId === dashboardId;
		return true;
	});
	if (duplicate) return;

	const item: CedarPolicyItem = { action };
	if (scopedToTable) item.tableName = tableName;
	if (scopedToDashboard) item.dashboardId = dashboardId;
	policies.value = [...policies.value, item];
	resetAddForm();
}

function removePolicy(index: number) {
	policies.value = policies.value.filter((_, i) => i !== index);
}

function startEdit(index: number) {
	const policy = policies.value[index];
	if (!policy) return;
	editingIndex.value = index;
	editItem.action = policy.action;
	editItem.tableName = policy.tableName || '';
	editItem.dashboardId = policy.dashboardId || '';
}

function saveEdit(index: number) {
	const { action, tableName, dashboardId } = editItem;
	if (!action) return;
	const scopedToTable = needsTable(action);
	const scopedToDashboard = needsDashboard(action);
	if (scopedToTable && !tableName) return;
	if (scopedToDashboard && !dashboardId) return;

	const updated = [...policies.value];
	updated[index] = {
		action,
		tableName: scopedToTable ? tableName : undefined,
		dashboardId: scopedToDashboard ? dashboardId : undefined,
	};
	policies.value = updated;
	editingIndex.value = null;
}

function cancelEdit() {
	editingIndex.value = null;
}

function resetAddForm() {
	adding.value = false;
	newItem.action = '';
	newItem.tableName = '';
	newItem.dashboardId = '';
}

/** An unfinished add (an action picked) or an open inline edit. */
function hasPendingChanges(): boolean {
	return (adding.value && !!newItem.action) || editingIndex.value !== null;
}

function discardPending() {
	if (adding.value) resetAddForm();
	if (editingIndex.value !== null) cancelEdit();
}

defineExpose({ hasPendingChanges, discardPending });
</script>

<template>
	<div class="cedar-policy-list">
		<div v-if="loading" class="cedar-policy-list__loader">
			<AppContentLoader label="Loading tables" />
		</div>

		<div v-if="!loading && policies.length === 0 && !adding" class="cedar-policy-list__empty">
			<p>No policies defined. Add a policy to grant permissions.</p>
			<UiButton size="sm" @click="adding = true">
				<template #leading><UiIcon name="add" size="sm" /></template>
				Add policy
			</UiButton>
		</div>

		<section v-for="group in groupedPolicies" :key="group.label" class="policy-group">
			<button
				type="button"
				class="policy-group__header"
				:aria-expanded="collapsedGroups.has(group.label) ? 'false' : 'true'"
				:title="group.description"
				@click="toggleGroup(group.label)"
			>
				<span :class="['policy-group__icon-box', `policy-group__icon-box--${group.colorClass}`]">
					<UiIcon :name="group.icon" size="sm" />
				</span>
				<span class="policy-group__label">{{ group.label }}</span>
				<span class="policy-group__count">{{ group.policies.length }}</span>
				<UiIcon
					name="expand_more"
					:class="['policy-group__chevron', { 'policy-group__chevron--collapsed': collapsedGroups.has(group.label) }]"
				/>
			</button>

			<div v-if="!collapsedGroups.has(group.label)" class="policy-group__items">
				<div v-for="entry in group.policies" :key="entry.originalIndex" class="policy-item" data-testid="policy-item">
					<template v-if="editingIndex !== entry.originalIndex">
						<div class="policy-item__content">
							<UiIcon
								v-tooltip="actionLabel(entry.item.action)"
								class="policy-item__action-icon"
								:name="actionIcon(entry.item.action)"
								size="sm"
							/>
							<span class="policy-item__label">{{ actionShortLabel(entry.item.action) }}</span>
							<span v-if="entry.item.tableName" class="policy-item__scope">
								{{ tableDisplayName(entry.item.tableName) }}
							</span>
							<span v-if="entry.item.dashboardId" class="policy-item__scope">
								{{ dashboardDisplayName(entry.item.dashboardId) }}
							</span>
						</div>
						<div class="policy-item__actions">
							<UiIconButton icon="edit" label="Edit" size="sm" @click="startEdit(entry.originalIndex)" />
							<UiIconButton icon="delete" label="Delete" size="sm" @click="removePolicy(entry.originalIndex)" />
						</div>
					</template>
					<CedarPolicyItemForm
						v-else
						v-model:action="editItem.action"
						v-model:table-name="editItem.tableName"
						v-model:dashboard-id="editItem.dashboardId"
						:action-groups="editActionGroups"
						:all-action-groups="displayGroups"
						:available-tables="availableTables"
						:available-dashboards="availableDashboards"
						:used-tables="usedTables"
						:used-dashboards="usedDashboards"
						submit-label="Save"
						@submit="saveEdit(entry.originalIndex)"
						@cancel="cancelEdit"
					/>
				</div>
			</div>
		</section>

		<div v-if="adding" class="policy-item policy-item--add" data-testid="policy-add-form">
			<CedarPolicyItemForm
				v-model:action="newItem.action"
				v-model:table-name="newItem.tableName"
				v-model:dashboard-id="newItem.dashboardId"
				:action-groups="addActionGroups"
				:all-action-groups="displayGroups"
				:available-tables="availableTables"
				:available-dashboards="availableDashboards"
				:used-tables="usedTables"
				:used-dashboards="usedDashboards"
				submit-label="Add"
				@submit="addPolicy"
				@cancel="resetAddForm"
			/>
		</div>
	</div>
</template>

<style scoped>
.cedar-policy-list {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.cedar-policy-list__loader {
	position: relative;
	min-height: var(--space-16);
}

.cedar-policy-list__empty {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--space-3);
	padding: var(--space-3) 0;
	font-size: var(--text-sm);
}

.cedar-policy-list__empty p {
	margin: 0;
	color: var(--color-muted);
}

/* ── Group ── */

.policy-group {
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
}

.policy-group__header {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	width: 100%;
	padding: var(--space-2) var(--space-3);
	border: 0;
	background: var(--color-paper);
	color: var(--color-ink);
	font: inherit;
	text-align: start;
	cursor: pointer;
	user-select: none;
}

.policy-group__header:hover {
	background: var(--color-paper-2);
}

.policy-group__header:focus-visible {
	outline: none;
	box-shadow: var(--shadow-focus);
}

.policy-group__icon-box {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	color: var(--color-muted);
}

.policy-group__icon-box--general {
	background: var(--color-warning-bg);
	color: var(--color-warning);
}

.policy-group__icon-box--connection,
.policy-group__icon-box--dashboard {
	background: var(--color-paper-2);
	color: var(--color-accent);
}

.policy-group__icon-box--group {
	background: var(--color-paper-2);
	color: var(--color-accent-ink);
}

.policy-group__icon-box--table {
	background: var(--color-success-bg);
	color: var(--color-success);
}

.policy-group__label {
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
}

.policy-group__count {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 1.25rem;
	height: 1.25rem;
	margin-inline-start: auto;
	padding: 0 var(--space-1);
	border-radius: var(--radius-pill);
	background: var(--color-paper-2);
	color: var(--color-muted);
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
}

.policy-group__chevron {
	color: var(--color-muted);
	transition: transform var(--motion-fast) var(--ease-out);
}

.policy-group__chevron--collapsed {
	transform: rotate(-90deg);
}

.policy-group__items {
	display: flex;
	flex-direction: column;
}

/* ── Policy item ── */

.policy-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-2);
	padding: var(--space-2) var(--space-4);
	border-top: 1px solid var(--color-line);
}

.policy-item--add {
	padding: var(--space-3) var(--space-4);
	border: 1px dashed var(--color-line-strong);
	border-radius: var(--radius-card);
}

.policy-item__content {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--space-2);
	min-width: 0;
}

.policy-item__action-icon {
	color: var(--color-muted);
}

.policy-item__label {
	font-size: var(--text-sm);
	font-weight: var(--weight-medium);
	color: var(--color-ink);
}

.policy-item__scope {
	font-size: var(--text-sm);
	font-style: italic;
	color: var(--color-muted);
}

.policy-item__actions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
}
</style>
