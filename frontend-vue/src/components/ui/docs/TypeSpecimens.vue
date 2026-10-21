<script setup lang="ts">
import { computed } from 'vue';
import SpecimenList from './SpecimenList.vue';

/**
 * The four typography specimen grids. Each renders the same sample string at every step of one
 * scale, which is the only way to judge whether a scale's steps are actually distinguishable — a
 * table of rem values isn't.
 *
 * These live in a Vue component rather than inline in the MDX because MDX compiles to React here:
 * a `.vue` component referenced from MDX is handed to `React.jsx()` and throws. The supported
 * bridge is a story, so every Foundations visual is a story in `foundations.stories.ts` wrapping
 * one of these components.
 */
const props = defineProps<{
	/** Which scale to render. */
	scale: 'family' | 'size' | 'leading' | 'weight';
}>();

const prefix = computed(
	() =>
		({
			family: '--font-',
			size: '--text-',
			leading: '--leading-',
			weight: '--weight-',
		})[props.scale],
);

const SAMPLE = 'Publish your site in one prompt';
const PARAGRAPH =
	'SiteNova turns a prompt into a deployed website. Describe what you want, review the generated build, and publish it to your own subdomain — no toolchain, no hosting setup.';
</script>

<template>
	<SpecimenList :prefix="prefix">
		<template #default="{ cssVar, value }">
			<span
				v-if="scale === 'family'"
				:style="{ fontFamily: `var(${cssVar})`, fontSize: 'var(--text-md)' }"
			>
				{{ SAMPLE }} — 0123456789
			</span>
			<span
				v-else-if="scale === 'size'"
				:style="{ fontSize: `var(${cssVar})`, lineHeight: 'var(--leading-snug)' }"
			>
				{{ SAMPLE }} — {{ value }}
			</span>
			<p
				v-else-if="scale === 'leading'"
				class="type-specimens__paragraph"
				:style="{ lineHeight: `var(${cssVar})` }"
			>
				{{ PARAGRAPH }}
			</p>
			<span v-else :style="{ fontWeight: `var(${cssVar})`, fontSize: 'var(--text-md)' }">
				{{ SAMPLE }}
			</span>
		</template>
	</SpecimenList>
</template>

<style scoped>
.type-specimens__paragraph {
	max-width: 34rem;
	margin: 0;
	font-size: var(--text-base);
}
</style>
