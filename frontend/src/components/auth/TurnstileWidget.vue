<script setup lang="ts">
// Port of frontend/src/app/components/ui-components/turnstile (TurnstileComponent): renders the
// Cloudflare Turnstile challenge once `window.turnstile` (loaded async by index.saas.html) exists,
// polling for it for up to 5 s, and emits the token. `reset()` is exposed for callers that need a
// fresh token after a failed submit.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { environment } from '@/environment';

const props = withDefaults(
	defineProps<{
		/** Turnstile site key; defaults to the build's `VITE_TURNSTILE_SITE_KEY`. */
		siteKey?: string;
		theme?: 'light' | 'dark' | 'auto';
	}>(),
	{ siteKey: () => environment.turnstileSiteKey, theme: 'auto' },
);

const emit = defineEmits<{
	'token-received': [token: string];
	'token-error': [];
	'token-expired': [];
}>();

const MAX_POLL_ATTEMPTS = 50;
const POLL_INTERVAL_MS = 100;

const container = ref<HTMLDivElement | null>(null);
let widgetId: string | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

onMounted(waitForTurnstileAndRender);

onBeforeUnmount(() => {
	clearPollInterval();
	removeWidget();
});

function reset(): void {
	if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
}

defineExpose({ reset });

function waitForTurnstileAndRender(): void {
	let attempts = 0;
	pollInterval = setInterval(() => {
		attempts++;
		if (window.turnstile) {
			clearPollInterval();
			renderWidget();
			return;
		}
		if (attempts >= MAX_POLL_ATTEMPTS) {
			clearPollInterval();
			console.error('Turnstile script failed to load');
			emit('token-error');
		}
	}, POLL_INTERVAL_MS);
}

function renderWidget(): void {
	if (!window.turnstile || !container.value) return;
	widgetId = window.turnstile.render(container.value, {
		sitekey: props.siteKey,
		callback: (token: string) => emit('token-received', token),
		'error-callback': () => emit('token-error'),
		'expired-callback': () => emit('token-expired'),
		theme: props.theme,
		appearance: 'always',
	});
}

function removeWidget(): void {
	if (window.turnstile && widgetId) {
		window.turnstile.remove(widgetId);
		widgetId = null;
	}
}

function clearPollInterval(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}
</script>

<template>
	<div ref="container" class="turnstile" />
</template>

<style scoped>
.turnstile {
	display: flex;
	justify-content: center;
	margin: var(--space-4) 0;
}
</style>
