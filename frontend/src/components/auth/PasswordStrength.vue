<script setup lang="ts">
// Port of angular-password-strength-meter as UserPasswordComponent configured it: five segments,
// zxcvbn feedback on, minimum length 8. Scoring is debounced by 100 ms like the original; an empty
// password shows an empty bar, a too-short one scores 0 without feedback.
//
// The bar fills `round(((score + 1) / 5) * 100 / 20) * 20` percent and takes the colour of the
// filled level: danger-strong, danger, warning, success, success (Angular's dark red → green ramp).
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { loadPasswordScorer, type PasswordFeedback } from '@/lib/password-strength';

const props = withDefaults(
	defineProps<{
		password?: string | null;
		/** Below this length the score is 0 and zxcvbn is not consulted. */
		minPasswordLength?: number;
	}>(),
	{ password: '', minPasswordLength: 8 },
);

const emit = defineEmits<{ 'strength-change': [score: number | null] }>();

const SEGMENTS = 5;
const DEBOUNCE_MS = 100;
const LEVEL_TONES = ['danger-strong', 'danger', 'warning', 'success', 'success'] as const;

const score = ref<number | null>(null);
const feedback = ref<PasswordFeedback | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
let run = 0;

watch(
	() => props.password,
	(value) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => evaluate(value ?? ''), DEBOUNCE_MS);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	if (timer) clearTimeout(timer);
});

const fillPercent = computed(() => {
	if (score.value === null) return 0;
	const step = 100 / SEGMENTS;
	return Math.round((((score.value + 1) / 5) * 100) / step) * step;
});

const level = computed(() => (fillPercent.value / 100) * SEGMENTS);

const overlayClasses = computed(() => [
	'password-strength__overlay',
	`password-strength__overlay--${LEVEL_TONES[Math.max(0, level.value - 1)] ?? LEVEL_TONES[0]}`,
]);

async function evaluate(value: string): Promise<void> {
	const current = ++run;
	let next: { score: number | null; feedback: PasswordFeedback | null };
	if (!value) next = { score: null, feedback: null };
	else if (value.length < props.minPasswordLength) next = { score: 0, feedback: null };
	else {
		try {
			next = (await loadPasswordScorer()).check(value);
		} catch (error) {
			console.error('Password strength scorer failed to load', error);
			return;
		}
	}
	if (current !== run) return;
	const changed = next.score !== score.value;
	score.value = next.score;
	feedback.value = next.feedback;
	if (changed) emit('strength-change', next.score);
}
</script>

<template>
	<div class="password-strength" :data-strength="score ?? 0">
		<div
			class="password-strength__bar"
			role="progressbar"
			aria-label="Password strength"
			aria-valuemin="0"
			aria-valuemax="100"
			:aria-valuenow="fillPercent"
		>
			<span v-for="segment in SEGMENTS" :key="segment" class="password-strength__segment" />
			<span :class="overlayClasses" :style="{ width: `${fillPercent}%` }" />
		</div>

		<template v-if="feedback">
			<small v-if="feedback.warning" class="password-strength__text" data-testid="password-strength-warning">
				{{ feedback.warning }}
			</small>
			<small
				v-if="feedback.suggestions.length"
				class="password-strength__text"
				data-testid="password-strength-suggestions"
			>
				{{ feedback.suggestions.join(' ') }}
			</small>
		</template>
	</div>
</template>

<style scoped>
.password-strength {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
}

.password-strength__bar {
	position: relative;
	display: flex;
	gap: var(--space-1);
	height: 3px;
	margin: var(--space-2) 0;
	border-radius: var(--radius-pill);
	overflow: hidden;
}

.password-strength__segment {
	flex: 1;
	background: var(--color-line);
}

.password-strength__overlay {
	position: absolute;
	inset-block: 0;
	inset-inline-start: 0;
	border-radius: var(--radius-pill);
	transition:
		width var(--motion-slow),
		background var(--motion-fast);
}

.password-strength__overlay--danger-strong {
	background: var(--color-danger-strong);
}

.password-strength__overlay--danger {
	background: var(--color-danger);
}

.password-strength__overlay--warning {
	background: var(--color-warning);
}

.password-strength__overlay--success {
	background: var(--color-success);
}

.password-strength__text {
	font-size: var(--text-xs);
	color: var(--color-muted);
}
</style>
