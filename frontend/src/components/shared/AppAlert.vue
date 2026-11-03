<script setup lang="ts">
// Port of frontend/src/app/components/ui-components/alert (AlertComponent).
//
// Renders the given `alert`, or — like the Angular `this.alert || notifications.currentAlert` — the
// notifications store's page alert. Three message shapes, same as Angular's getMessageType():
// a string (plain), `{abstract, details}` with details (bold abstract over the details), and
// `{abstract}` alone (plain abstract). `message: null` renders the default slot instead — how
// connect-db puts the IP-address hint inside a warning alert.
//
// Actions follow AlertActionType: `button` calls `action(alert.id)`, `internal link` is a
// RouterLink, `external link` opens in a new tab. Sticky under the header, as in Angular.
import { computed } from 'vue';
import { UiAlert, UiButton, UiIcon } from '@/components/ui';
import { type Alert, type AlertAction, AlertActionType, type AlertType } from '@/models/alert';
import { useNotificationsStore } from '@/stores/notifications';

const props = defineProps<{
	/** An alert to show instead of the store's current page alert. */
	alert?: Alert | null;
}>();

const notifications = useNotificationsStore();

const current = computed<Alert | null>(() => props.alert || notifications.alert);

const ICONS: Record<AlertType, string> = {
	error: 'error',
	warning: 'warning',
	info: 'info',
	success: 'task_alt',
};

/** Mirrors Angular's getMessageType(), minus its habit of mutating the alert while rendering. */
const message = computed(() => {
	const value = current.value?.message;
	if (value === null || value === undefined) return { kind: 'slot' as const };
	if (typeof value === 'string') return { kind: 'plain' as const, text: value };
	if (value.details) return { kind: 'complex' as const, abstract: value.abstract, details: value.details };
	return { kind: 'plain' as const, text: value.abstract };
});

function onButton(action: AlertAction) {
	if (current.value) action.action?.(current.value.id);
}
</script>

<template>
	<UiAlert v-if="current" :key="current.id" :tone="current.type" class="app-alert">
		<div class="app-alert__body">
			<UiIcon :name="ICONS[current.type]" class="app-alert__icon" />

			<div
				v-if="message.kind === 'complex'"
				class="app-alert__message"
				:data-testid="`alert-${current.type}-message-box`"
			>
				<strong class="app-alert__title" data-testid="alert-abstract">{{ message.abstract }}</strong>
				<p class="app-alert__text" data-testid="alert-details">{{ message.details }}</p>
			</div>
			<p
				v-else-if="message.kind === 'plain'"
				class="app-alert__message"
				:data-testid="`alert-${current.type}-message`"
			>
				{{ message.text }}
			</p>
			<div v-else class="app-alert__message">
				<slot />
			</div>

			<div v-if="current.actions?.length" class="app-alert__actions">
				<template v-for="action in current.actions" :key="action.caption">
					<UiButton
						v-if="action.type === AlertActionType.Button"
						variant="ghost"
						size="sm"
						data-testid="alert-action-button"
						@click="onButton(action)"
					>
						{{ action.caption }}
					</UiButton>
					<UiButton
						v-else-if="action.type === AlertActionType.Anchor"
						variant="ghost"
						size="sm"
						:href="action.to"
						target="_blank"
						rel="noopener noreferrer"
						data-testid="alert-action-external-link"
					>
						{{ action.caption }}
					</UiButton>
					<UiButton
						v-else-if="action.type === AlertActionType.Link && action.to"
						variant="ghost"
						size="sm"
						:to="action.to"
						data-testid="alert-action-internal-link"
					>
						{{ action.caption }}
					</UiButton>
				</template>
			</div>
		</div>
	</UiAlert>
</template>

<style scoped>
/* Sticky under the header while the page scrolls, as the Angular :host was. */
.app-alert {
	position: sticky;
	top: calc(var(--header-height) + var(--space-6));
	z-index: var(--z-sticky);
}

.app-alert__body {
	display: flex;
	align-items: flex-start;
	gap: var(--space-3);
}

.app-alert__icon {
	margin-top: var(--space-05);
}

.app-alert__message {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--space-1);
	min-width: 0;
	min-height: var(--space-6);
	margin: 0;
	overflow-wrap: anywhere;
}

.app-alert__title {
	font-weight: var(--weight-semibold);
}

.app-alert__text {
	margin: 0;
}

.app-alert__actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-2);
	margin-inline-start: auto;
}

/* Narrow screens: icon + message on one row, actions on their own full-width row. */
@media (width <= 600px) {
	.app-alert__body {
		display: grid;
		grid-template-columns: auto 1fr;
	}

	.app-alert__actions {
		grid-column: 1 / -1;
		justify-content: flex-end;
	}
}
</style>
