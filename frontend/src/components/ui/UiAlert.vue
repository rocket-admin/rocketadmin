<script setup lang="ts">
/**
 * Status banner. Replaces 9 near-identical `.alert` blocks whose geometry was already unanimous
 * (`0.75rem 0.875rem` / 14px) — only the radius and the margins had drifted.
 *
 * **No margin.** The nine call sites sit in genuinely different layout contexts (above a form,
 * below a row, tight against a `.setting`), so spacing belongs to the caller via `class`
 * passthrough. This is the one place the design system deliberately does not unify a value.
 *
 * `live` defaults on because every existing alert displays an async fetch result and **none of the
 * nine announce today** — the failure is silent for screenreader users.
 */
import { computed } from 'vue';

type AlertTone = 'error' | 'success' | 'info' | 'warning';

const props = withDefaults(
	defineProps<{
		/** Status colour. Non-interactive, so this is `tone`, not `variant`. */
		tone?: AlertTone;
		/** Announces the content when it appears. Turn off only for content present on first paint. */
		live?: boolean;
	}>(),
	{ tone: 'error', live: true },
);

const classes = computed(() => ['ui-alert', `ui-alert--${props.tone}`]);

/* `alert` is assertive and interrupts; `status` is polite and waits for a pause. An error the user
   just caused warrants the interruption, a success confirmation does not. */
const role = computed(() => {
	if (!props.live) return undefined;
	return props.tone === 'error' || props.tone === 'warning' ? 'alert' : 'status';
});
</script>

<template>
	<div :class="classes" :role="role">
		<slot />
	</div>
</template>

<style scoped>
.ui-alert {
  /* margin: 0 is load-bearing — it overrides the UA default on the <p>s these replace, and keeps
     spacing the caller's decision. */
  margin: 0;
  padding: var(--space-3) 0.875rem;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.ui-alert--error {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.ui-alert--success {
  background: var(--color-success-bg);
  border-color: var(--color-success-border);
  color: var(--color-success);
}

.ui-alert--warning {
  background: var(--color-warning-bg);
  border-color: var(--color-warning-border);
  color: var(--color-warning);
}

.ui-alert--info {
  background: var(--color-paper-2);
  border-color: var(--color-line);
  color: var(--color-ink-soft);
}
</style>
