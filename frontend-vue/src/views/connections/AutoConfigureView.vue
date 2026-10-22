<script setup lang="ts">
// Port of frontend/src/app/components/auto-configure (/auto-configure/:connectionId): runs the AI
// setup of a freshly added connection, shows its progress as a short human-readable log, then
// summarises what was configured and opens the dashboard.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { countMessage, humanizeMessage } from '@/components/connections/autoConfigureMessages';
import { UiButton, UiSpinner } from '@/components/ui';
import { useConfigurationStateStore } from '@/stores/configuration-state';

/** How long the summary stays up before the dashboard opens. */
const SUMMARY_DELAY_MS = 1800;

const route = useRoute();
const router = useRouter();
const configState = useConfigurationStateStore();

const value = route.params.connectionId;
const connectionId = (Array.isArray(value) ? value[0] : value) || null;

const messages = ref<string[]>(['Initializing…']);
const tablesConfigured = ref(new Set<string>());
const widgetsCount = ref(0);
const settingsCount = ref(0);

const progress = computed(() => configState.progress);
const errorText = computed(() =>
	progress.value?.type === 'error' ? (progress.value.message ?? 'Something went wrong.') : null,
);
const done = computed(() => progress.value?.type === 'complete');
const hasSummary = computed(
	() => done.value && (tablesConfigured.value.size > 0 || widgetsCount.value > 0 || settingsCount.value > 0),
);

watch(progress, (p) => {
	if (p?.type === 'message' && p.text) {
		const counted = countMessage(p.text);
		if (counted.table) addConfiguredTable(counted.table);
		if (counted.kind === 'widget') widgetsCount.value++;
		if (counted.kind === 'setting') settingsCount.value++;
	}
	const raw =
		p?.type === 'message' && p.text ? p.text : p?.type === 'complete' ? 'All done — opening your dashboard…' : null;
	if (!raw) return;
	const incoming = humanizeMessage(raw);
	if (!incoming) return;
	if (messages.value[messages.value.length - 1] === incoming) return;
	messages.value = [...messages.value, incoming].slice(-5);
});

onMounted(async () => {
	if (!connectionId) {
		router.push('/connections-list');
		return;
	}
	await configState.startConfiguring(connectionId);
	// Let the user read the summary chips before navigating away.
	await new Promise((resolve) => setTimeout(resolve, SUMMARY_DELAY_MS));
	router.push(`/dashboard/${connectionId}`);
});

function addConfiguredTable(name: string) {
	if (tablesConfigured.value.has(name)) return;
	tablesConfigured.value = new Set([...tablesConfigured.value, name]);
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
</script>

<template>
	<div class="auto-configure">
		<div class="auto-configure__card">
			<div class="auto-configure__body">
				<UiSpinner v-if="!done" size="lg" class="auto-configure__spinner" label="Configuring" />
				<div v-else class="auto-configure__success" role="img" aria-label="Configuration complete">
					<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
						<circle class="auto-configure__success-circle" cx="26" cy="26" r="25" />
						<path class="auto-configure__success-check" d="M14 27 l8 8 l16 -18" />
					</svg>
				</div>

				<h2 class="auto-configure__title">{{ done ? 'Your database is ready' : 'Configuring your database' }}</h2>

				<div class="auto-configure__detail">
					<p v-if="!done" class="auto-configure__subtitle">
						We're analyzing your structure and applying the best settings. This is running in the background.
					</p>
					<div v-if="hasSummary" class="auto-configure__chips" data-testid="auto-configure-summary">
						<span class="auto-configure__chip">
							<strong>{{ tablesConfigured.size }}</strong> {{ plural(tablesConfigured.size, 'table', 'tables') }}
						</span>
						<span v-if="widgetsCount > 0" class="auto-configure__chip">
							<strong>{{ widgetsCount }}</strong> {{ plural(widgetsCount, 'widget', 'widgets') }}
						</span>
						<span v-if="settingsCount > 0" class="auto-configure__chip">
							<strong>{{ settingsCount }}</strong> {{ plural(settingsCount, 'setting', 'settings') }}
						</span>
					</div>
					<p v-if="done && !hasSummary" class="auto-configure__subtitle">All set — opening your dashboard…</p>
				</div>

				<p v-if="errorText" class="auto-configure__error" role="alert">{{ errorText }}</p>
				<ul v-else class="auto-configure__log" aria-live="polite">
					<li
						v-for="(message, index) in messages"
						:key="index"
						:class="[
							'auto-configure__log-item',
							index === messages.length - 1 ? 'auto-configure__log-item--current' : 'auto-configure__log-item--done',
						]"
					>
						<span class="auto-configure__log-icon" aria-hidden="true">
							<span v-if="index !== messages.length - 1" class="auto-configure__log-check">✓</span>
							<UiSpinner v-else size="sm" />
						</span>
						<span>{{ message }}</span>
					</li>
				</ul>
			</div>

			<div class="auto-configure__footer">
				<p class="auto-configure__footer-text">You can start working — setup will continue in the background.</p>
				<UiButton :to="`/dashboard/${connectionId}`" class="auto-configure__cta">
					Open tables
					<template #trailing><span aria-hidden="true">&rarr;</span></template>
				</UiButton>
			</div>
		</div>
	</div>
</template>

<style scoped>
.auto-configure {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: var(--space-4);
	background: var(--color-paper-2);
}

.auto-configure__card {
	width: 100%;
	max-width: 30rem;
	overflow: hidden;
	border-radius: var(--radius-card);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
}

.auto-configure__body {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-3);
	padding: var(--space-10) var(--space-8) var(--space-6);
}

.auto-configure__spinner {
	color: var(--color-accent);
}

.auto-configure__success {
	height: 4.5rem;
	width: 4.5rem;
}

.auto-configure__success svg {
	height: 100%;
	width: 100%;
	overflow: visible;
}

.auto-configure__success-circle {
	fill: none;
	stroke: var(--color-success);
	stroke-width: 2;
	stroke-linecap: round;
	stroke-dasharray: 158;
	stroke-dashoffset: 158;
	animation: auto-configure-draw 500ms var(--ease-out) forwards;
}

.auto-configure__success-check {
	fill: none;
	stroke: var(--color-success);
	stroke-width: 3.5;
	stroke-linecap: round;
	stroke-linejoin: round;
	stroke-dasharray: 36;
	stroke-dashoffset: 36;
	animation: auto-configure-draw 350ms 400ms var(--ease-out) forwards;
}

@keyframes auto-configure-draw {
	to {
		stroke-dashoffset: 0;
	}
}

.auto-configure__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-bold);
	text-align: center;
	color: var(--color-ink);
}

.auto-configure__detail {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	min-height: 4rem;
	width: 100%;
}

.auto-configure__subtitle {
	max-width: 22.5rem;
	margin: 0;
	font-size: var(--text-sm);
	line-height: var(--leading-normal);
	text-align: center;
	color: var(--color-muted);
}

.auto-configure__chips {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--space-2);
	margin-top: var(--space-1);
}

.auto-configure__chip {
	display: inline-flex;
	align-items: baseline;
	gap: var(--space-1);
	padding: var(--space-1) var(--space-25);
	border-radius: var(--radius-pill);
	background: var(--color-success-bg);
	color: var(--color-success);
	font-size: var(--text-xs);
	font-weight: var(--weight-medium);
	white-space: nowrap;
}

.auto-configure__log {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	gap: var(--space-2);
	height: 5rem;
	width: 100%;
	max-width: 22.5rem;
	margin: 0;
	padding: 0;
	overflow: hidden;
	list-style: none;
	mask-image: linear-gradient(to bottom, transparent 0, black 28px);
}

.auto-configure__log-item {
	display: flex;
	align-items: center;
	gap: var(--space-25);
	font-size: var(--text-sm);
	line-height: var(--leading-snug);
	text-align: left;
}

.auto-configure__log-item--done {
	color: var(--color-muted-soft);
	font-size: var(--text-xs);
}

.auto-configure__log-item--current {
	color: var(--color-ink);
	font-weight: var(--weight-medium);
}

.auto-configure__log-icon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	height: 1rem;
	width: 1rem;
}

.auto-configure__log-check {
	font-weight: var(--weight-bold);
}

.auto-configure__error {
	max-width: 22.5rem;
	margin: 0;
	font-size: var(--text-sm);
	text-align: center;
	color: var(--color-danger);
}

.auto-configure__footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
	padding: var(--space-4) var(--space-6);
	border-top: 1px solid var(--color-line);
}

.auto-configure__footer-text {
	flex: 1;
	margin: 0;
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.auto-configure__cta {
	flex-shrink: 0;
}

@media (width <= 600px) {
	.auto-configure__footer {
		flex-direction: column;
		text-align: center;
	}
}
</style>
