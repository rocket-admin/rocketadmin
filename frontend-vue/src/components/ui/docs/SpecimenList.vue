<script setup lang="ts">
import { computed } from 'vue';
import { readTokens, resolveToken, type Token } from './readTokens';

/**
 * One row per token, with a slot for whatever visual the page needs: a line of sample text sized by
 * the token, a spacing bar, a rounded corner, an elevated square. Covers everything a Foundations
 * page needs beyond a flat table without each page re-implementing the label column.
 */
const props = defineProps<{
	/** Token prefix to enumerate, including the leading `--`. */
	prefix: string;
	/** Exclude tokens whose name is in this list. For prefixes that overlap (`--space-` vs `--space-25`). */
	exclude?: string[];
}>();

type Row = Token & { literal: string };

const rows = computed<Row[]>(() =>
	readTokens(props.prefix)
		.filter((token) => !props.exclude?.includes(token.name))
		.map((token) => ({ ...token, literal: resolveToken(token.name) ?? '?' })),
);
</script>

<template>
	<ul class="specimen-list">
		<li v-for="row in rows" :key="row.name" class="specimen">
			<div class="specimen__meta">
				<code class="specimen__name">{{ row.name }}</code>
				<code class="specimen__value">{{ row.literal }}</code>
				<span v-if="row.note" class="specimen__note">{{ row.note }}</span>
			</div>
			<div class="specimen__visual">
				<!-- Deliberately not `:name` — that's the slot-name attribute, so Vue would treat it as
				     naming a *named* slot instead of passing a prop. -->
				<slot :token="row" :css-var="row.name" :value="row.literal" />
			</div>
		</li>
	</ul>
</template>

<style scoped>
.specimen-list {
	margin: var(--space-4) 0;
	padding: 0;
	list-style: none;
}

.specimen {
	display: grid;
	grid-template-columns: 14rem minmax(0, 1fr);
	gap: var(--space-4);
	align-items: center;
	padding: var(--space-3) 0;
	border-bottom: 1px solid var(--color-line);
}

.specimen__meta {
	display: flex;
	flex-direction: column;
	gap: var(--space-05);
}

.specimen__name,
.specimen__value {
	font-family: var(--font-mono);
	font-size: var(--text-2xs);
}

.specimen__name {
	color: var(--color-ink);
	font-weight: var(--weight-medium);
}

.specimen__value {
	color: var(--color-ink-soft);
}

.specimen__note {
	font-size: var(--text-2xs);
	color: var(--color-muted);
}

.specimen__visual {
	min-width: 0;
}
</style>
