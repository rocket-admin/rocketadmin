<script setup lang="ts">
// The actions page with no automations yet: what an automation is (a trigger, then an action), the
// "Create first automation" call to action and the docs link.
import { UiButton, UiIcon } from '@/components/ui';

defineEmits<{ create: [] }>();

const triggers = [
	{ key: 'add', icon: 'add_circle_outline', title: 'Add row', desc: 'New record is created' },
	{ key: 'update', icon: 'edit', title: 'Update row', desc: 'Record is modified' },
	{ key: 'delete', icon: 'delete_outline', title: 'Delete row', desc: 'Record is removed' },
	{ key: 'custom', icon: 'download', title: 'Custom', desc: 'Custom button trigger' },
];

const actions = [
	{ icon: 'webhook', label: 'Webhook' },
	{ icon: 'email', label: 'Email' },
	{ icon: 'tag', label: 'Slack' },
];
</script>

<template>
	<div class="automations-empty">
		<div class="automations-empty__header">
			<div class="automations-empty__icon-box"><UiIcon name="bolt" /></div>
			<h2 class="automations-empty__title">Automate your database workflows</h2>
			<p class="automations-empty__subtitle">Set up triggers and actions to react to data changes automatically.</p>
			<div class="automations-empty__cta">
				<UiButton data-testid="create-first-automation-button" @click="$emit('create')">
					Create first automation
				</UiButton>
				<a
					class="automations-empty__docs"
					href="https://docs.rocketadmin.com/Reference/Automations/automations_definition"
					target="_blank"
					rel="noopener noreferrer"
				>
					Docs <UiIcon name="open_in_new" size="sm" />
				</a>
			</div>
		</div>

		<div class="automations-empty__flow">
			<div class="automations-empty__section">
				<span class="automations-empty__badge automations-empty__badge--when">WHEN</span>
				<span>Trigger</span>
			</div>
			<div class="automations-empty__triggers">
				<div
					v-for="trigger in triggers"
					:key="trigger.key"
					:class="['automations-empty__trigger', `automations-empty__trigger--${trigger.key}`]"
				>
					<span class="automations-empty__trigger-icon"><UiIcon :name="trigger.icon" /></span>
					<span class="automations-empty__trigger-text">
						<span class="automations-empty__trigger-title">{{ trigger.title }}</span>
						<span class="automations-empty__trigger-desc">{{ trigger.desc }}</span>
					</span>
				</div>
			</div>

			<div class="automations-empty__connector">
				<span class="automations-empty__line" />
				<span class="automations-empty__pill">THEN</span>
				<span class="automations-empty__line" />
			</div>

			<div class="automations-empty__section">
				<span class="automations-empty__badge automations-empty__badge--action">ACTION</span>
			</div>
			<div class="automations-empty__actions">
				<div v-for="action in actions" :key="action.label" class="automations-empty__action">
					<span class="automations-empty__action-icon"><UiIcon :name="action.icon" /></span>
					<span>{{ action.label }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.automations-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-4);
	max-width: 56rem;
	margin: var(--space-10) auto 0;
}

.automations-empty__header {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.automations-empty__icon-box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	margin-bottom: var(--space-4);
	border-radius: var(--radius-control);
	color: var(--color-accent);
	background: var(--color-paper-2);
}

.automations-empty__title {
	margin: 0 0 var(--space-2);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.automations-empty__subtitle {
	margin: 0 0 var(--space-5);
	color: var(--color-muted);
}

.automations-empty__cta {
	display: flex;
	align-items: center;
	gap: var(--space-4);
}

.automations-empty__docs {
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	color: var(--color-accent);
}

.automations-empty__flow {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	width: 100%;
	padding: var(--space-6);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	background: var(--color-surface);
}

.automations-empty__section {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	font-weight: var(--weight-medium);
}

.automations-empty__badge {
	padding: var(--space-05) var(--space-2);
	border-radius: var(--radius-pill);
	font-size: var(--text-2xs);
	font-weight: var(--weight-bold);
	letter-spacing: 0.06em;
}

.automations-empty__badge--when {
	color: var(--color-accent-ink);
	background: var(--color-accent);
}

.automations-empty__badge--action {
	color: var(--color-paper);
	background: var(--color-ink);
}

.automations-empty__triggers,
.automations-empty__actions {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
	gap: var(--space-3);
}

.automations-empty__trigger,
.automations-empty__action {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	padding: var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
}

.automations-empty__trigger-icon,
.automations-empty__action-icon {
	display: flex;
	color: var(--color-muted);
}

.automations-empty__trigger--add .automations-empty__trigger-icon {
	color: var(--color-success);
}

.automations-empty__trigger--update .automations-empty__trigger-icon {
	color: var(--color-accent);
}

.automations-empty__trigger--delete .automations-empty__trigger-icon {
	color: var(--color-danger);
}

.automations-empty__trigger--custom .automations-empty__trigger-icon {
	color: var(--color-hot);
}

.automations-empty__trigger-text {
	display: flex;
	flex-direction: column;
}

.automations-empty__trigger-title {
	font-weight: var(--weight-medium);
}

.automations-empty__trigger-desc {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.automations-empty__connector {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.automations-empty__line {
	flex: 1;
	height: 1px;
	background: var(--color-line);
}

.automations-empty__pill {
	padding: var(--space-05) var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-pill);
	font-size: var(--text-2xs);
	font-weight: var(--weight-bold);
	color: var(--color-muted);
}
</style>
