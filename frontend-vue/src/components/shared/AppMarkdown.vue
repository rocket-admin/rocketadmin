<script setup lang="ts">
/**
 * Rendered Markdown — the `<markdown [data]>` (ngx-markdown) replacement for the markdown view and
 * display fields.
 *
 * `marked` parses, DOMPurify sanitizes: the source is user data from a database column, so the
 * HTML is never trusted. ngx-markdown sanitized through Angular's DomSanitizer for the same reason.
 * Mermaid diagrams (the AI panel) are a separate concern and are added there.
 */
import { computed } from 'vue';
import { renderMarkdown } from '@/lib/markdown';

const props = withDefaults(
	defineProps<{
		/** Markdown source. `null` renders nothing. */
		source?: string | null;
		/** Renders inline (no block wrappers' margins), for one-line previews in a table cell. */
		inline?: boolean;
	}>(),
	{ inline: false },
);

const html = computed(() => renderMarkdown(props.source ?? '', { inline: props.inline }));
</script>

<template>
	<div class="app-markdown" :class="{ 'app-markdown--inline': inline }" v-html="html" />
</template>

<style scoped>
.app-markdown {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-ink);
  overflow-wrap: anywhere;
}

.app-markdown :deep(:first-child) {
  margin-top: 0;
}

.app-markdown :deep(:last-child) {
  margin-bottom: 0;
}

.app-markdown :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: 0 var(--space-1);
  border-radius: var(--radius-control);
  background: var(--color-paper-2);
}

.app-markdown :deep(pre) {
  padding: var(--space-3);
  overflow-x: auto;
  border-radius: var(--radius-control);
  background: var(--color-paper-2);
}

.app-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
}

.app-markdown :deep(a) {
  color: var(--color-accent);
}

.app-markdown--inline {
  display: inline;
}
</style>
