<script setup lang="ts">
/**
 * Port of table-display-fields/markdown (`MarkdownDisplayComponent`): a one-line preview — the first
 * heading, else the first paragraph, truncated at 100 characters — as plain text (like Angular,
 * so inline markup in the title shows as typed), with the whole source as a tooltip.
 */
import { marked } from 'marked';
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const displayTitle = computed(() => extractTitle(props.value));

/** Headings first, then the first paragraph/text, then the first line. */
function extractTitle(markdown: string | null | undefined): string {
	if (!markdown || markdown.trim() === '') return '—';
	try {
		const tokens = marked.lexer(markdown);
		const heading = tokens.find((token) => token.type === 'heading');
		if (heading && 'text' in heading) return truncate(heading.text, 100);
		for (const token of tokens) {
			if (token.type === 'paragraph' && 'text' in token) return truncate(token.text, 100);
			if (token.type === 'text' && 'text' in token && token.text.trim().length > 0) return truncate(token.text, 100);
		}
	} catch {
		// Fall through to the first line.
	}
	return truncate(markdown.trim().split('\n')[0] ?? '', 100);
}

function truncate(text: string, maxLength: number): string {
	const cleaned = text.trim();
	if (cleaned.length > maxLength) return `${cleaned.substring(0, maxLength)}...`;
	return cleaned || '—';
}
</script>

<template>
	<TableDisplayCell @copy="copy(value)">
		<span class="markdown-display__preview" :title="value || undefined">{{ displayTitle }}</span>
	</TableDisplayCell>
</template>
