<script setup lang="ts">
import { computed } from 'vue';
import { readTokens, resolveToken } from './readTokens';

/**
 * A grid of colour swatches for one token prefix, or for an explicit subset of it.
 *
 * The swatch itself is painted with `var(--token)` rather than the resolved hex, so what you see is
 * genuinely what the theme produces — if the alias chain breaks, the swatch goes transparent and
 * the page shows the bug instead of hiding it behind a copied literal.
 */
const props = withDefaults(
	defineProps<{
		/** Token prefix to enumerate, including the leading `--`. */
		prefix: string;
		/** Restrict to these exact token names, in this order. Omit to show the whole prefix. */
		only?: string[];
		/** Draw a hairline border on each swatch — needed for near-white surfaces. */
		bordered?: boolean;
	}>(),
	{ bordered: false },
);

const swatches = computed(() => {
	const tokens = props.only
		? props.only.flatMap((name) => readTokens(name).filter((token) => token.name === name))
		: readTokens(props.prefix);
	return tokens.map((token) => ({
		...token,
		literal: resolveToken(token.name) ?? '?',
		/* An alias's declared value is the interesting part: it names which palette step it points
		   at, which is the thing a reviewer checks. */
		alias: token.value.startsWith('var(') ? token.value : undefined,
	}));
});
</script>

<template>
	<ul class="swatch-grid">
		<li v-for="swatch in swatches" :key="swatch.name" class="swatch">
			<span
				class="swatch__chip"
				:class="{ 'swatch__chip--bordered': bordered }"
				:style="{ background: `var(${swatch.name})` }"
			/>
			<code class="swatch__name">{{ swatch.name }}</code>
			<code class="swatch__literal">{{ swatch.literal }}</code>
			<code v-if="swatch.alias" class="swatch__alias">{{ swatch.alias }}</code>
			<span v-if="swatch.note" class="swatch__note">{{ swatch.note }}</span>
		</li>
	</ul>
</template>

<style scoped>
.swatch-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
	gap: var(--space-4);
	margin: var(--space-4) 0;
	padding: 0;
	list-style: none;
}

.swatch {
	display: flex;
	flex-direction: column;
	gap: var(--space-05);
}

.swatch__chip {
	height: 3.5rem;
	margin-bottom: var(--space-1);
	border-radius: var(--radius-control);
	box-shadow: var(--shadow-card);
}

.swatch__chip--bordered {
	box-shadow: none;
	border: 1px solid var(--color-line);
}

.swatch__name,
.swatch__literal,
.swatch__alias {
	font-family: var(--font-mono);
	font-size: var(--text-2xs);
}

.swatch__name {
	color: var(--color-ink);
	font-weight: var(--weight-medium);
}

.swatch__literal {
	color: var(--color-ink-soft);
}

.swatch__alias,
.swatch__note {
	color: var(--color-muted);
	font-size: var(--text-2xs);
}
</style>
