<script setup lang="ts">
// Port of frontend/src/app/components/users/cedar-policy-editor-dialog: edits a group's Cedar policy,
// either through the form builder (CedarPolicyList) or as Cedar text in Monaco. The text is checked
// in the Cedar wasm engine before it is saved, and before switching back to the form.
//
// Closing is always confirmed through confirmClose(), so Escape, the backdrop and × never drop an
// unfinished form row silently (MatDialog's disableClose + backdropClick/keydownEvents).
import { computed, nextTick, onMounted, ref } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import { type SelectOption, UiAlert, UiButton, UiIcon, UiModal, UiSegmented } from '@/components/ui';
import { useCedarValidator } from '@/composables/useCedarValidator';
import { useDialogRef } from '@/composables/useDialog';
import { registerCedarLanguage } from '@/lib/cedar-monaco-language';
import { type CedarPolicyItem, permissionsToPolicyItems, policyItemsToCedarPolicy } from '@/lib/cedar-policy-items';
import { canRepresentAsForm, parseCedarDashboardItems, parseCedarPolicy } from '@/lib/cedar-policy-parser';
import { loadMonaco } from '@/lib/monaco';
import { normalizeTableName } from '@/lib/normalize';
import type { TablePermission } from '@/models/user';
import { useConnectionsStore } from '@/stores/connections';
import { useDashboardsQuery } from '@/stores/dashboards';
import { useTablesStore } from '@/stores/tables';
import { useUsersStore } from '@/stores/users';
import CedarPolicyList from './CedarPolicyList.vue';
import type { AvailableDashboard, AvailableTable, CedarPolicyEditorDialogData } from './types';

type EditorMode = 'form' | 'code';

const props = defineProps<{ data: CedarPolicyEditorDialogData }>();

const dialogRef = useDialogRef();
const connections = useConnectionsStore();
const tablesStore = useTablesStore();
const users = useUsersStore();
const { validate } = useCedarValidator();

const connectionId = connections.connectionID ?? '';
const { dashboards } = useDashboardsQuery(connectionId);

// The language has to exist before the editor creates its model; this runs ahead of the editor's own load.
loadMonaco()
	.then((monaco) => registerCedarLanguage(monaco))
	.catch(() => {});

const cedarPolicy = ref(props.data.cedarPolicy || '');
const submitting = ref(false);
const editorMode = ref<EditorMode>('form');
/** Remounts the mode toggle when a switch is refused, so its native radios match editorMode again. */
const modeToggleKey = ref(0);
const policyItems = ref<CedarPolicyItem[]>([]);
const availableTables = ref<AvailableTable[]>([]);
const allTables = ref<TablePermission[]>([]);
const loading = ref(true);
const formParseError = ref(false);
const validationErrors = ref<string[]>([]);
const adding = ref(false);

const policyList = ref<InstanceType<typeof CedarPolicyList> | null>(null);
const content = ref<HTMLElement | null>(null);

const modeOptions: SelectOption<EditorMode>[] = [
	{ value: 'form', label: 'Form' },
	{ value: 'code', label: 'Code' },
];

const availableDashboards = computed<AvailableDashboard[]>(() =>
	dashboards.value.map((dashboard) => ({ id: dashboard.id, name: dashboard.name })),
);

const showAddPolicy = computed(
	() =>
		editorMode.value === 'form' &&
		!formParseError.value &&
		!loading.value &&
		!adding.value &&
		policyItems.value.length > 0,
);

onMounted(async () => {
	let tables: Awaited<ReturnType<typeof tablesStore.fetchTables>>;
	try {
		tables = await tablesStore.fetchTables(connectionId);
	} catch {
		// Reported by the store; like the Angular dialog, the form stays on its loader.
		return;
	}

	const nextAllTables: TablePermission[] = [];
	const nextAvailableTables: AvailableTable[] = [];
	for (const table of tables) {
		const displayName = table.display_name || normalizeTableName(table.table);
		nextAllTables.push({
			tableName: table.table,
			display_name: displayName,
			accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
		});
		nextAvailableTables.push({ tableName: table.table, displayName });
	}
	allTables.value = nextAllTables;
	availableTables.value = nextAvailableTables;
	loading.value = false;

	const policy = cedarPolicy.value;
	if (policy) {
		formParseError.value = !canRepresentAsForm(policy);
		if (formParseError.value) editorMode.value = 'code';
		else policyItems.value = parseCedarToPolicyItems();
	}
});

function onCedarPolicyChange(value: string) {
	cedarPolicy.value = value;
	validationErrors.value = [];
}

async function onEditorModeChange(mode: EditorMode) {
	if (mode === editorMode.value) return;

	if (mode === 'code') {
		cedarPolicy.value = policyItemsToCedarPolicy(policyItems.value, connectionId, props.data.groupId);
		formParseError.value = false;
		validationErrors.value = [];
	} else {
		const policy = cedarPolicy.value;
		const validation = await validate(policy);
		if (!validation.valid) {
			validationErrors.value = validation.errors;
			modeToggleKey.value++;
			return;
		}
		validationErrors.value = [];
		formParseError.value = !canRepresentAsForm(policy);
		if (formParseError.value) {
			modeToggleKey.value++;
			return;
		}
		policyItems.value = parseCedarToPolicyItems();
	}

	editorMode.value = mode;
}

/** Asks before dropping an unfinished form row; false when the user keeps it. */
function confirmDiscardPending(message: string): boolean {
	const list = policyList.value;
	if (editorMode.value !== 'form' || !list?.hasPendingChanges()) return true;
	if (!window.confirm(message)) return false;
	list.discardPending();
	return true;
}

function confirmClose() {
	if (submitting.value) return;
	if (!confirmDiscardPending('You have an unsaved policy in the form. Discard it and close?')) return;
	dialogRef.close();
}

async function savePolicy() {
	if (!confirmDiscardPending('You have an unsaved policy in the form. Discard it and save?')) return;

	submitting.value = true;

	if (editorMode.value === 'form') {
		cedarPolicy.value = policyItemsToCedarPolicy(policyItems.value, connectionId, props.data.groupId);
	}

	const policy = cedarPolicy.value;
	if (!policy) {
		submitting.value = false;
		dialogRef.close();
		return;
	}

	const validation = await validate(policy);
	if (!validation.valid) {
		validationErrors.value = validation.errors;
		submitting.value = false;
		return;
	}
	validationErrors.value = [];

	try {
		await users.saveCedarPolicy(connectionId, props.data.groupId, policy);
		dialogRef.close();
	} catch {
		// The store has shown the error.
	} finally {
		submitting.value = false;
	}
}

async function onAddPolicyClick() {
	adding.value = true;
	await nextTick();
	content.value?.querySelector('[data-testid="policy-add-form"]')?.scrollIntoView?.({ block: 'nearest' });
}

function parseCedarToPolicyItems(): CedarPolicyItem[] {
	const policy = cedarPolicy.value;
	const parsed = parseCedarPolicy(policy, connectionId, props.data.groupId, allTables.value);
	const dashboardItems = parseCedarDashboardItems(policy, connectionId);
	return [...permissionsToPolicyItems(parsed), ...dashboardItems];
}
</script>

<template>
	<UiModal :open="true" :title="`Policy — ${data.groupTitle}`" size="md" form @close="confirmClose" @submit="savePolicy">
		<div ref="content" class="cedar-editor">
			<UiSegmented
				:key="modeToggleKey"
				class="cedar-editor__mode"
				:model-value="editorMode"
				:options="modeOptions"
				label="Editor mode"
				size="sm"
				@update:model-value="onEditorModeChange"
			/>

			<UiAlert v-if="formParseError" tone="warning">
				This policy uses advanced Cedar syntax that cannot be represented in form mode. Please use the code
				editor.
			</UiAlert>

			<CedarPolicyList
				v-if="editorMode === 'form' && !formParseError"
				ref="policyList"
				v-model:policies="policyItems"
				v-model:adding="adding"
				:available-tables="availableTables"
				:available-dashboards="availableDashboards"
				:loading="loading"
			/>

			<template v-if="editorMode === 'code'">
				<p class="cedar-editor__hint">
					Edit policy in
					<a href="https://www.cedarpolicy.com/en" target="_blank" rel="noopener">Cedar</a>
					format
				</p>
				<AppCodeEditor
					:model-value="cedarPolicy"
					language="cedar"
					label="Cedar policy"
					height="300px"
					@update:model-value="onCedarPolicyChange"
				/>
				<UiAlert v-if="validationErrors.length > 0" tone="error" data-testid="cedar-validation-errors">
					<span v-for="error in validationErrors" :key="error" class="cedar-editor__error">{{ error }}</span>
				</UiAlert>
			</template>
		</div>

		<template #footer>
			<UiButton variant="secondary" :disabled="submitting" @click="confirmClose">Cancel</UiButton>
			<span class="cedar-editor__spacer" />
			<UiButton v-if="showAddPolicy" variant="ghost" @click="onAddPolicyClick">
				<template #leading><UiIcon name="add" size="sm" /></template>
				Add policy
			</UiButton>
			<UiButton type="submit" :loading="submitting">Save</UiButton>
		</template>
	</UiModal>
</template>

<style scoped>
.cedar-editor {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	max-height: calc(100vh - 14rem);
	overflow-y: auto;
}

.cedar-editor__mode {
	align-self: flex-start;
}

.cedar-editor__hint {
	margin: 0;
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.cedar-editor__hint a {
	color: inherit;
	text-decoration: underline;
}

.cedar-editor__error {
	display: block;
}

.cedar-editor__spacer {
	flex: 1;
}
</style>
