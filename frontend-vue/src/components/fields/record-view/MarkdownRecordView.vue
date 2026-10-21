<script setup lang="ts">
/** Port of record-view-fields/markdown (`MarkdownRecordViewComponent`): the value rendered as sanitized Markdown. */
import AppMarkdown from '@/components/shared/AppMarkdown.vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';

defineProps<RecordViewFieldProps & { value?: string | null }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<div class="markdown-record-view">
		<AppMarkdown :source="value || ''" />
	</div>
</template>

<style scoped>
.markdown-record-view {
  min-height: 100px;
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-paper-2);
  color: var(--color-ink-soft);
}

.markdown-record-view :deep(h1),
.markdown-record-view :deep(h2),
.markdown-record-view :deep(h3),
.markdown-record-view :deep(h4),
.markdown-record-view :deep(h5),
.markdown-record-view :deep(h6) {
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
}

.markdown-record-view :deep(p) {
  margin-bottom: var(--space-2);
}

.markdown-record-view :deep(ul),
.markdown-record-view :deep(ol) {
  margin-bottom: var(--space-2);
  margin-inline-start: var(--space-5);
}

.markdown-record-view :deep(blockquote) {
  margin-inline-start: 0;
  padding-inline-start: var(--space-4);
  border-inline-start: 4px solid var(--color-line-strong);
  color: var(--color-muted);
}
</style>
