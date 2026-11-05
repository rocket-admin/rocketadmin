<script setup lang="ts">
// Renders the notifications store's snackbars (the MatSnackBar replacement), bottom-left like the
// Angular app, or top-left for `showSuccessSnackbar(msg, 'top')`.
import { computed } from 'vue';
import { useNotificationsStore } from '@/stores/notifications';

const notifications = useNotificationsStore();

const top = computed(() => notifications.snackbars.filter((snackbar) => snackbar.position === 'top'));
const bottom = computed(() => notifications.snackbars.filter((snackbar) => snackbar.position === 'bottom'));
</script>

<template>
	<div
		v-for="[position, items] in [['top', top], ['bottom', bottom]] as const"
		:key="position"
		:class="['app-snackbars', `app-snackbars--${position}`]"
		role="status"
		aria-live="polite"
	>
		<div
			v-for="snackbar in items"
			:key="snackbar.id"
			:class="['app-snackbars__item', `app-snackbars__item--${snackbar.tone}`]"
		>
			<span class="app-snackbars__message">{{ snackbar.message }}</span>
			<button
				v-if="snackbar.actionLabel"
				type="button"
				class="app-snackbars__action"
				@click="notifications.dismissSnackbar(snackbar.id)"
			>
				{{ snackbar.actionLabel }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.app-snackbars {
	position: fixed;
	left: var(--space-4);
	z-index: var(--z-toast);
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	max-width: min(36rem, calc(100vw - var(--space-8)));
	pointer-events: none;
}

.app-snackbars--top {
	top: var(--space-4);
}

.app-snackbars--bottom {
	bottom: var(--space-4);
}

.app-snackbars__item {
	display: flex;
	align-items: center;
	gap: var(--space-4);
	padding: var(--space-3) var(--space-4);
	border-radius: var(--radius-control);
	background: var(--color-ink);
	color: var(--color-surface);
	box-shadow: var(--shadow-lift);
	font-size: var(--text-sm);
	pointer-events: auto;
}

.app-snackbars__message {
	flex: 1;
}

.app-snackbars__action {
	flex: none;
	padding: var(--space-1) var(--space-2);
	border: none;
	border-radius: var(--radius-control);
	background: transparent;
	color: var(--color-hot);
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
	cursor: pointer;
}

.app-snackbars__action:hover {
	background: var(--color-ink-soft);
}
</style>
