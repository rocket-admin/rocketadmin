<script setup lang="ts">
import { computed } from 'vue';
import SpecimenList from './SpecimenList.vue';

/**
 * The spacing, radius, elevation and motion specimen grids — the scales whose visual is a shape
 * rather than text. Same rationale as TypeSpecimens for living in a `.vue` file: MDX compiles to
 * React, so Foundations visuals reach the docs as stories.
 */
const props = defineProps<{
	/** Which scale to render. */
	scale: 'space' | 'radius' | 'shadow' | 'ring' | 'motion';
	/** Paint the specimens on `--color-surface` instead of the page background. */
	onSurface?: boolean;
}>();

const prefix = computed(
	() =>
		({
			space: '--space-',
			radius: '--radius-',
			shadow: '--shadow-',
			ring: '--ring-',
			motion: '--motion-',
		})[props.scale],
);
</script>

<template>
	<div class="scale-specimens" :class="{ 'scale-specimens--surface': onSurface }">
		<SpecimenList :prefix="prefix">
			<template #default="{ cssVar }">
				<!-- A bar whose width is the token: the only rendering in which "8px vs 12px" is legible. -->
				<span v-if="scale === 'space'" class="bar" :style="{ width: `var(${cssVar})` }" />
				<span
					v-else-if="scale === 'radius'"
					class="corner"
					:style="{ borderRadius: `var(${cssVar})` }"
				/>
				<span
					v-else-if="scale === 'shadow' || scale === 'ring'"
					class="raised"
					:style="{ boxShadow: `var(${cssVar})` }"
				/>
				<!-- Hover to play the transition; the token is the duration, the easing is shared. -->
				<span v-else class="mover" :style="{ transitionDuration: `var(${cssVar})` }">
					hover me
				</span>
			</template>
		</SpecimenList>
	</div>
</template>

<style scoped>
.scale-specimens--surface {
	padding: var(--space-4);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
}

.bar {
	display: block;
	height: 1.25rem;
	min-width: 1px;
	border-radius: var(--radius-control);
	background: var(--color-accent);
}

.corner {
	display: block;
	width: 5rem;
	height: 3.5rem;
	border: 1px solid var(--color-line);
	background: var(--color-surface);
}

.raised {
	display: block;
	width: 6rem;
	height: 3.5rem;
	border-radius: var(--radius-panel);
	background: var(--color-surface);
}

.mover {
	display: inline-block;
	padding: var(--space-2) var(--space-4);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	color: var(--color-ink-soft);
	font-size: var(--text-xs);
	transition-property: transform, background-color;
	transition-timing-function: var(--ease-out);
}

.mover:hover {
	transform: translateX(var(--space-8));
	background: var(--color-accent);
	color: var(--color-surface);
}
</style>
