<script setup lang="ts">
/**
 * Small status pill — styled text, not a control. Replaces the three hand-rolled `.chip` blocks
 * (WebsitesView, AccountView, DashboardView) whose only real disagreement was padding.
 *
 * Deliberately has **no ARIA role, no tabindex and no click event**. A chip labels something else;
 * it is not an affordance. A removable/filter chip is a different component and a new conversation.
 *
 * `text-transform: capitalize` was **dropped** from DashboardView's copy on purpose: casing an
 * arbitrary status string is data-dependent presentation and belongs to the call site. Phase 8's
 * migration should capitalise `{{ status }}` in the view (or via a class there) rather than
 * re-adding it here.
 */
import { computed } from 'vue';

type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const props = withDefaults(
	defineProps<{
		/**
		 * Status colour. Non-interactive, so this is `tone`, not `variant`. `accent` collapses
		 * AccountView's `.chip--accent` and DashboardView's `.chip--status`, which were both
		 * paper-2 + accent.
		 */
		tone?: ChipTone;
		/** Geometry only. `sm` is the majority geometry; `md` matches DashboardView's status chip. */
		size?: 'sm' | 'md';
	}>(),
	{ tone: 'neutral', size: 'sm' },
);

const classes = computed(() => ['ui-chip', `ui-chip--${props.tone}`, `ui-chip--size-${props.size}`]);
</script>

<template>
	<span :class="classes">
		<slot />
	</span>
</template>

<style scoped>
.ui-chip {
  display: inline-block;
  border-radius: var(--radius-pill);
  font-weight: var(--weight-medium);
  line-height: var(--leading-snug);
  white-space: nowrap;
}

/* --space-25 (10px) is off the 4px scale; theme.css documents the exception, chip padding
   included. Snapping to 12px would widen every chip in a dense list. */
.ui-chip--size-sm {
  padding: var(--space-1) var(--space-25);
  font-size: var(--text-2xs);
}

.ui-chip--size-md {
  padding: 0.35rem var(--space-3);
  font-size: var(--text-xs);
}

.ui-chip--neutral {
  background: var(--color-paper-2);
  color: var(--color-muted);
}

.ui-chip--accent {
  background: var(--color-paper-2);
  color: var(--color-accent);
}

.ui-chip--success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.ui-chip--warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.ui-chip--danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
</style>
