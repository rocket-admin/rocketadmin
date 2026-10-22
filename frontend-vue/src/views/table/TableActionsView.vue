<script setup lang="ts">
// Port of frontend/src/app/components/dashboard/db-table-view/db-table-actions: the table's
// automations (`/dashboard/:connectionId/:tableName/actions`). A sidebar lists the rules; the main
// pane edits the selected one as WHEN (triggers, plus the custom button's settings) → THEN (one URL
// webhook / email / Slack action). The logic lives in useTableRules().
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppBreadcrumbs from '@/components/shared/AppBreadcrumbs.vue';
import AppContentLoader from '@/components/shared/AppContentLoader.vue';
import AppIconPicker from '@/components/shared/AppIconPicker.vue';
import AutomationsEmptyState from '@/components/table/AutomationsEmptyState.vue';
import { trackTableEvent } from '@/components/table/analytics';
import WebhookSnippets from '@/components/table/WebhookSnippets.vue';
import {
	type SelectOption,
	UiButton,
	UiCheckbox,
	UiField,
	UiIcon,
	UiInput,
	UiList,
	UiListItem,
	UiSegmented,
	UiSelect,
} from '@/components/ui';
import { AVAILABLE_EVENTS, type RuleProblem, useTableRules } from '@/composables/useTableRules';
import type { CompanyMember } from '@/models/company';
import { EventType } from '@/models/table';
import { useCompanyStore } from '@/stores/company';
import { useConnectionsStore } from '@/stores/connections';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const connections = useConnectionsStore();
const userStore = useUserStore();
const company = useCompanyStore();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const tableName = computed(() => String(route.params.tableName ?? ''));

const rules = useTableRules({ connectionId, tableName });
const {
	rulesData,
	rules: ruleList,
	selectedRule,
	selectedRuleCustomEvent,
	selectedRuleTitle,
	selectedEvents,
	submitting,
	isSaved,
	isCreationMode,
	displayTableName,
	hasTriggersSelected,
	actionMethod,
} = rules;

const defaultIcons = [
	'favorite_outline',
	'star_outline',
	'done',
	'arrow_forward',
	'key_outline',
	'lock',
	'visibility',
	'language',
	'notifications',
	'schedule',
];

const TRIGGER_ICONS: Record<EventType, string> = {
	[EventType.AddRow]: 'add_circle_outline',
	[EventType.UpdateRow]: 'edit',
	[EventType.DeleteRow]: 'delete_outline',
	[EventType.Custom]: 'tune',
};

const customTypeOptions: SelectOption<string>[] = [
	{ value: 'single', label: 'Single row' },
	{ value: 'multiple', label: 'Multiple rows' },
];

const methodOptions: SelectOption<string>[] = [
	{ value: 'URL', label: 'URL webhook' },
	{ value: 'EMAIL', label: 'Email' },
	{ value: 'SLACK', label: 'Slack' },
];

const companyMembers = ref<CompanyMember[]>([]);
const memberOptions = computed<SelectOption<string>[]>(() =>
	companyMembers.value.map((member) => ({
		value: member.email,
		label: member.name ? `${member.name} | ${member.email}` : member.email,
	})),
);

const crumbs = computed(() => {
	const connection = connections.currentConnection;
	return [
		{ label: connection.title || connection.database, link: `/dashboard/${connectionId.value}` },
		{ label: displayTableName.value, link: `/dashboard/${connectionId.value}/${tableName.value}` },
		{ label: 'Automations', link: null },
	];
});

const tablePath = computed(() => `/dashboard/${connectionId.value}/${tableName.value}`);
const action = computed(() => selectedRule.value?.table_actions[0]);
const showEmptyState = computed(() => (!selectedRule.value || !ruleList.value?.length) && !isCreationMode.value);

const root = ref<HTMLElement | null>(null);
const triggerCard = ref<HTMLElement | null>(null);
const triggerHighlighted = ref(false);

onMounted(() => rules.load());

watch(
	() => userStore.currentUser?.company?.id,
	async (companyId) => {
		if (!companyId) return;
		try {
			companyMembers.value = await company.fetchCompanyMembers(companyId);
		} catch {
			// Reported by the store.
		}
	},
	{ immediate: true },
);

function addAutomation() {
	trackTableEvent('Actions: add first action is clicked');
	rules.addNewRule();
}

async function submit() {
	const problem = await rules.handleRuleSubmitting();
	if (problem) await pointAt(problem);
}

/** Moves the user to what the rule still lacks. */
async function pointAt(problem: RuleProblem) {
	await nextTick();
	if (problem === 'trigger') {
		triggerCard.value?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
		triggerHighlighted.value = true;
		setTimeout(() => {
			triggerHighlighted.value = false;
		}, 1500);
		return;
	}
	const selector: Record<Exclude<RuleProblem, 'trigger'>, string> = {
		title: 'input[name="rule-title"]',
		url: 'input[name="action-url"]',
		emails: 'select[name="notification-emails"]',
		slack: 'input[name="action-slack-url"]',
	};
	root.value?.querySelector<HTMLElement>(selector[problem])?.focus();
}

function setEmails(value: string | string[] | null) {
	if (action.value) action.value.emails = Array.isArray(value) ? value : [];
}
</script>

<template>
	<div ref="root" class="table-actions">
		<aside class="table-actions__sidebar" aria-label="Automations">
			<h1 class="table-actions__heading">Automations</h1>
			<p v-if="rulesData && ruleList && ruleList.length === 0 && !isCreationMode" class="table-actions__none">
				No automations yet
			</p>
			<UiList v-if="rulesData && ruleList" size="sm" class="table-actions__list">
				<UiListItem
					v-for="(rule, index) in ruleList"
					:key="rule.id || `new-${index}`"
					interactive
					:active="!!selectedRule && rule.title === selectedRule.title"
					:class="{ 'table-actions__rule--unsaved': rule.id === '' }"
					@click="rules.switchRulesView(rule)"
				>
					{{ rule.title || 'New automation' }}
				</UiListItem>
			</UiList>
			<UiButton
				v-if="rulesData && ruleList && !isCreationMode"
				variant="secondary"
				block
				class="table-actions__add"
				data-testid="add-automation-button"
				@click="addAutomation"
			>
				<template #leading><UiIcon name="add" /></template>
				Add automation
			</UiButton>
		</aside>

		<div v-if="rulesData" class="table-actions__main">
			<AppAlert />
			<AppBreadcrumbs :crumbs="crumbs" />
			<AppContentLoader v-if="!ruleList" />

			<form
				v-if="selectedRule && ruleList?.length"
				class="table-actions__form"
				novalidate
				@submit.prevent="submit"
				@input="isSaved = false"
			>
				<div class="table-actions__name-row">
					<UiField label="Automation name" class="table-actions__name">
						<UiInput
							:model-value="selectedRuleTitle"
							name="rule-title"
							data-testid="rule-title-input"
							@update:model-value="rules.setTitle"
						/>
					</UiField>
					<UiButton v-if="isCreationMode" variant="ghost" @click="rules.undoRule()">Cancel</UiButton>
					<UiButton v-else variant="ghost" data-testid="rule-delete-button" @click="rules.handleRemoveRule()">
						Delete
					</UiButton>
				</div>

				<section
					ref="triggerCard"
					:class="['table-actions__card', { 'table-actions__card--highlight': triggerHighlighted }]"
					aria-labelledby="table-actions-when"
				>
					<h2 id="table-actions-when" class="table-actions__card-label">
						<span class="table-actions__badge table-actions__badge--when">WHEN</span> Trigger
					</h2>

					<div class="table-actions__pills">
						<template v-for="(event, index) in AVAILABLE_EVENTS" :key="event.value">
							<span v-if="index > 0" class="table-actions__or">or</span>
							<label
								:class="[
									'table-actions__pill',
									`table-actions__pill--${event.value.toLowerCase()}`,
									{ 'table-actions__pill--active': selectedEvents.includes(event.value) },
								]"
							>
								<input
									type="checkbox"
									class="table-actions__pill-checkbox"
									:checked="selectedEvents.includes(event.value)"
									:data-testid="`trigger-${event.value}`"
									@change="rules.toggleTriggerTile(event.value)"
								>
								<UiIcon :name="TRIGGER_ICONS[event.value]" class="table-actions__pill-icon" />
								<span>{{ event.label }}</span>
							</label>
						</template>
					</div>

					<div v-if="selectedRuleCustomEvent" class="table-actions__custom">
						<UiField label="Button label">
							<UiInput v-model="selectedRuleCustomEvent.title" name="custom-event-title" />
						</UiField>
						<AppIconPicker
							:icon="selectedRuleCustomEvent.icon"
							:default-icons="defaultIcons"
							tooltip="Choose an icon"
							@change="rules.updateIcon"
						/>
						<UiCheckbox v-model="selectedRuleCustomEvent.require_confirmation" name="custom-event-confirmation">
							Request confirmation
						</UiCheckbox>
						<div class="table-actions__affects">
							<span class="table-actions__affects-label">Affects</span>
							<UiSegmented
								:model-value="selectedRuleCustomEvent.type"
								:options="customTypeOptions"
								label="Affects"
								size="sm"
								@update:model-value="rules.setCustomEventType"
							/>
						</div>
					</div>
				</section>

				<div class="table-actions__connector" aria-hidden="true" />

				<section
					:class="['table-actions__card', { 'table-actions__card--disabled': !hasTriggersSelected }]"
					aria-labelledby="table-actions-then"
				>
					<h2 id="table-actions-then" class="table-actions__card-label">
						<span class="table-actions__badge table-actions__badge--then">THEN</span> Action
					</h2>
					<p v-if="!hasTriggersSelected" class="table-actions__hint">Add a trigger first</p>
					<template v-else-if="action">
						<UiSegmented
							:model-value="actionMethod"
							:options="methodOptions"
							label="Action method"
							@update:model-value="rules.selectActionMethod"
						/>

						<div class="table-actions__fields">
							<template v-if="actionMethod === 'URL'">
								<UiField label="Webhook URL">
									<UiInput v-model="action.url" name="action-url" type="url" />
								</UiField>
								<p class="table-actions__hint">Use the code snippets below to verify requests.</p>
								<WebhookSnippets :signing-key="connections.connectionSigningKey" />
							</template>

							<UiField v-if="actionMethod === 'EMAIL'" label="Notification emails">
								<UiSelect
									:model-value="action.emails"
									:options="memberOptions"
									multiple
									name="notification-emails"
									@update:model-value="setEmails"
								/>
							</UiField>

							<UiField v-if="actionMethod === 'SLACK'" label="Slack webhook URL">
								<UiInput v-model="action.slack_url" name="action-slack-url" type="url" />
							</UiField>
						</div>
					</template>
				</section>

				<div class="table-actions__actions">
					<UiButton variant="secondary" :to="tablePath">Back</UiButton>
					<UiButton type="submit" data-testid="rule-save-button" :disabled="submitting || isSaved">
						{{ isSaved ? 'Saved' : 'Save' }}
					</UiButton>
				</div>
			</form>

			<AutomationsEmptyState v-if="showEmptyState" @create="addAutomation" />
		</div>
	</div>
</template>

<style scoped>
.table-actions {
	display: flex;
	min-height: 100%;
}

.table-actions__sidebar {
	flex-shrink: 0;
	width: clamp(12.5rem, 18%, 20rem);
	padding: var(--space-4) var(--space-3);
	border-right: 1px solid var(--color-line);
	overflow-y: auto;
}

.table-actions__heading {
	margin: 0 var(--space-1) var(--space-3);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.table-actions__none {
	margin: 0;
	padding: var(--space-4) 0;
	text-align: center;
	color: var(--color-muted);
}

.table-actions__rule--unsaved {
	font-style: italic;
}

.table-actions__add {
	margin-top: var(--space-2);
}

.table-actions__main {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--space-4);
	min-width: 0;
	padding: var(--space-6) var(--space-8) 0;
	overflow-y: auto;
}

.table-actions__form {
	display: flex;
	flex-direction: column;
	max-width: 56rem;
}

.table-actions__name-row {
	display: flex;
	align-items: flex-end;
	gap: var(--space-3);
	margin-bottom: var(--space-5);
}

.table-actions__name {
	flex: 1;
}

.table-actions__card {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	padding: var(--space-5);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	background: var(--color-surface);
	transition: box-shadow var(--motion-base) var(--ease-out);
}

.table-actions__card--highlight {
	box-shadow: var(--shadow-focus);
}

.table-actions__card--disabled {
	color: var(--color-muted);
}

.table-actions__card-label {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	margin: 0;
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
}

.table-actions__badge {
	padding: var(--space-05) var(--space-2);
	border-radius: var(--radius-pill);
	font-size: var(--text-2xs);
	font-weight: var(--weight-bold);
	letter-spacing: 0.06em;
}

.table-actions__badge--when {
	color: var(--color-accent-ink);
	background: var(--color-accent);
}

.table-actions__badge--then {
	color: var(--color-paper);
	background: var(--color-ink);
}

.table-actions__pills {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-2);
}

.table-actions__or {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.table-actions__pill {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--color-line-strong);
	border-radius: var(--radius-pill);
	cursor: pointer;
	user-select: none;
}

.table-actions__pill:focus-within {
	box-shadow: var(--shadow-focus);
}

.table-actions__pill-checkbox {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
}

.table-actions__pill--active {
	border-color: currentcolor;
	font-weight: var(--weight-medium);
}

.table-actions__pill--add_row.table-actions__pill--active {
	color: var(--color-success);
	background: var(--color-success-bg);
}

.table-actions__pill--update_row.table-actions__pill--active {
	color: var(--color-accent);
	background: var(--color-paper-2);
}

.table-actions__pill--delete_row.table-actions__pill--active {
	color: var(--color-danger);
	background: var(--color-danger-bg);
}

.table-actions__pill--custom.table-actions__pill--active {
	color: var(--color-hot);
	background: var(--color-paper-2);
}

.table-actions__custom {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: var(--space-4);
	padding-top: var(--space-2);
}

.table-actions__affects {
	display: flex;
	align-items: center;
	gap: var(--space-2);
}

.table-actions__affects-label {
	font-size: var(--text-sm);
	color: var(--color-muted);
}

.table-actions__connector {
	width: 1px;
	height: var(--space-6);
	margin-left: var(--space-8);
	background: var(--color-line-strong);
}

.table-actions__hint {
	margin: 0;
	font-size: var(--text-sm);
	color: var(--color-muted);
}

.table-actions__fields {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
}

.table-actions__actions {
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
	.table-actions {
		flex-direction: column;
	}

	.table-actions__sidebar {
		width: 100%;
		border-right: 0;
		border-bottom: 1px solid var(--color-line);
	}

	.table-actions__main {
		padding: var(--space-4) var(--space-4) 0;
	}
}
</style>
