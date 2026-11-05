<script setup lang="ts">
// The action / table / dashboard pickers of the policy builder, shared by its "add" row and the
// inline edit of an existing policy (the two copies of this markup in cedar-policy-list.component).
import { computed } from 'vue';
import { type SelectOption, UiButton, UiField, UiSelect } from '@/components/ui';
import type { PolicyActionGroup } from '@/lib/cedar-policy-items';
import { actionLabel } from '@/lib/permission-display';
import { scopeResource } from './policyList';
import type { AvailableDashboard, AvailableTable } from './types';

const props = defineProps<{
	/** The action picker's groups. */
	actionGroups: PolicyActionGroup[];
	/** Every known action, to tell what the chosen one is scoped to. */
	allActionGroups: PolicyActionGroup[];
	availableTables: AvailableTable[];
	availableDashboards: AvailableDashboard[];
	/** Short labels of the actions already granted per table, shown next to it. */
	usedTables: Map<string, string[]>;
	/** Short labels of the actions already granted per dashboard. */
	usedDashboards: Map<string, string[]>;
	submitLabel: string;
}>();

const action = defineModel<string>('action', { required: true });
const tableName = defineModel<string>('tableName', { required: true });
const dashboardId = defineModel<string>('dashboardId', { required: true });

const emit = defineEmits<{ submit: []; cancel: [] }>();

const actions = computed(() => props.allActionGroups.flatMap((group) => group.actions));
const needsTable = computed(() => scopeResource(actions.value, action.value) === 'table');
const needsDashboard = computed(() => scopeResource(actions.value, action.value) === 'dashboard');

const incomplete = computed(
	() => !action.value || (needsTable.value && !tableName.value) || (needsDashboard.value && !dashboardId.value),
);

const actionOptions = computed<SelectOption<string>[]>(() =>
	props.actionGroups.flatMap((group) =>
		group.actions.map((item) => ({ value: item.value, label: actionLabel(item.value), group: group.group })),
	),
);

function withHint(label: string, used: string[] | undefined): string {
	return used?.length ? `${label} — ${used.join(', ')}` : label;
}

const tableOptions = computed<SelectOption<string>[]>(() => [
	{ value: '*', label: 'All tables' },
	...props.availableTables.map((table) => ({
		value: table.tableName,
		label: withHint(table.displayName, props.usedTables.get(table.tableName)),
	})),
]);

const dashboardOptions = computed<SelectOption<string>[]>(() => [
	{ value: '*', label: 'All dashboards' },
	...props.availableDashboards.map((dashboard) => ({
		value: dashboard.id,
		label: withHint(dashboard.name, props.usedDashboards.get(dashboard.id)),
	})),
]);

function asString(value: string | string[] | null): string {
	return typeof value === 'string' ? value : '';
}

function submit() {
	if (incomplete.value) return;
	emit('submit');
}
</script>

<template>
	<div class="policy-item-form">
		<UiField label="Action" class="policy-item-form__field">
			<UiSelect
				:model-value="action || null"
				:options="actionOptions"
				placeholder="Select action"
				size="sm"
				@update:model-value="action = asString($event)"
			/>
		</UiField>

		<UiField v-if="needsTable" label="Table" class="policy-item-form__field">
			<UiSelect
				:model-value="tableName || null"
				:options="tableOptions"
				placeholder="Select table"
				size="sm"
				@update:model-value="tableName = asString($event)"
			/>
		</UiField>

		<UiField v-if="needsDashboard" label="Dashboard" class="policy-item-form__field">
			<UiSelect
				:model-value="dashboardId || null"
				:options="dashboardOptions"
				placeholder="Select dashboard"
				size="sm"
				@update:model-value="dashboardId = asString($event)"
			/>
		</UiField>

		<div class="policy-item-form__actions">
			<UiButton size="sm" :disabled="incomplete" @click="submit">{{ submitLabel }}</UiButton>
			<UiButton size="sm" variant="ghost" @click="emit('cancel')">Cancel</UiButton>
		</div>
	</div>
</template>

<style scoped>
.policy-item-form {
	display: flex;
	flex: 1;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: var(--space-2);
}

.policy-item-form__field {
	flex: 1;
	min-width: 11rem;
}

.policy-item-form__actions {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}
</style>
