<script setup lang="ts">
import { computed } from 'vue';
import { readTokens, resolveToken, type Token } from './readTokens';

/**
 * The shared table behind most Foundations pages: one row per token, with the declared value, the
 * value it resolves to through the alias layer, and the trailing comment from theme.css.
 *
 * Every Foundations grid is driven by `readTokens()` rather than a hand-written list, so a token
 * added to theme.css shows up in the docs on the next reload with nothing else to update.
 */
const props = withDefaults(
	defineProps<{
		/** Token prefix to enumerate, including the leading `--`. Ignored when `only` is given. */
		prefix?: string;
		/** Exact token names, in this order. Use for groups that don't share one prefix. */
		only?: string[];
		/** Show the resolved literal in its own column. Off for groups that hold no aliases. */
		resolved?: boolean;
		/** Render a `preview` slot column. The slot receives the token. */
		preview?: boolean;
	}>(),
	{ resolved: true, preview: false },
);

type Row = Token & { resolvedValue?: string };

const rows = computed<Row[]>(() => {
	const tokens = props.only
		? props.only.flatMap((name) => readTokens(name).filter((token) => token.name === name))
		: readTokens(props.prefix ?? '--');
	return tokens.map((token) => ({ ...token, resolvedValue: resolveToken(token.name) }));
});

/** Only worth a column when at least one row is an alias — otherwise it duplicates `value`. */
const showResolved = computed(() => props.resolved && rows.value.some((row) => row.value !== row.resolvedValue));
</script>

<template>
	<table class="token-table">
		<thead>
			<tr>
				<th v-if="preview" class="token-table__preview-head">Preview</th>
				<th>Token</th>
				<th>Declared</th>
				<th v-if="showResolved">Resolves to</th>
				<th>Note</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="row in rows" :key="row.name">
				<td v-if="preview" class="token-table__preview">
					<slot :token="row" :resolved="row.resolvedValue" />
				</td>
				<th scope="row"><code>{{ row.name }}</code></th>
				<td><code>{{ row.value }}</code></td>
				<td v-if="showResolved">
					<code>{{ row.value === row.resolvedValue ? '—' : row.resolvedValue }}</code>
				</td>
				<td class="token-table__note">{{ row.note ?? '' }}</td>
			</tr>
		</tbody>
	</table>
</template>

<style scoped>
.token-table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--text-sm);
	text-align: left;
}

.token-table th,
.token-table td {
	padding: var(--space-2) var(--space-3);
	border-bottom: 1px solid var(--color-line);
	vertical-align: middle;
}

.token-table thead th {
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color-muted);
}

.token-table tbody th {
	font-weight: var(--weight-medium);
	white-space: nowrap;
}

.token-table code {
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	color: var(--color-ink-soft);
}

.token-table__preview-head,
.token-table__preview {
	width: 1%;
	white-space: nowrap;
}

.token-table__note {
	color: var(--color-muted);
	font-size: var(--text-xs);
}
</style>
