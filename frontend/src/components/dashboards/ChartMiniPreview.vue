<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/chart-mini-preview: a static SVG glyph of a chart
// type, used as the panel-type thumbnail in the panels list and on dashboard cards.
import { computed, useId } from 'vue';
import type { ChartType } from '@/models/saved-query';

const props = withDefaults(defineProps<{ chartType?: ChartType | null }>(), { chartType: 'bar' });

const displayType = computed<ChartType>(() => props.chartType || 'bar');
// Two line previews on one page must not share a gradient id.
const gradientId = `${useId()}-line-gradient`;
</script>

<template>
	<div class="chart-mini-preview" :data-chart-type="displayType">
		<svg v-if="displayType === 'bar'" viewBox="0 0 100 60" class="chart-mini-preview__svg" aria-hidden="true">
			<rect x="18" y="30" width="16" height="25" rx="2" class="chart-mini-preview__shape--1" />
			<rect x="42" y="15" width="16" height="40" rx="2" class="chart-mini-preview__shape--2" />
			<rect x="66" y="22" width="16" height="33" rx="2" class="chart-mini-preview__shape--3" />
		</svg>

		<svg v-else-if="displayType === 'line'" viewBox="0 0 100 60" class="chart-mini-preview__svg" aria-hidden="true">
			<defs>
				<linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" class="chart-mini-preview__gradient-start" />
					<stop offset="100%" class="chart-mini-preview__gradient-end" />
				</linearGradient>
			</defs>
			<path d="M10,45 L30,30 L50,38 L70,18 L90,25" class="chart-mini-preview__line" fill="none" />
			<path d="M10,45 L30,30 L50,38 L70,18 L90,25 L90,55 L10,55 Z" class="chart-mini-preview__area" />
			<circle cx="10" cy="45" r="3" class="chart-mini-preview__dot" />
			<circle cx="30" cy="30" r="3" class="chart-mini-preview__dot" />
			<circle cx="50" cy="38" r="3" class="chart-mini-preview__dot" />
			<circle cx="70" cy="18" r="3" class="chart-mini-preview__dot" />
			<circle cx="90" cy="25" r="3" class="chart-mini-preview__dot" />
		</svg>

		<svg v-else-if="displayType === 'pie'" viewBox="0 0 60 60" class="chart-mini-preview__svg" aria-hidden="true">
			<g transform="translate(30, 30)" class="chart-mini-preview__slices">
				<path d="M0,-26 A26,26 0 0,1 22.5,13 L0,0 Z" class="chart-mini-preview__shape--1" />
				<path d="M22.5,13 A26,26 0 0,1 -22.5,13 L0,0 Z" class="chart-mini-preview__shape--2" />
				<path d="M-22.5,13 A26,26 0 0,1 0,-26 L0,0 Z" class="chart-mini-preview__shape--3" />
			</g>
		</svg>

		<svg v-else-if="displayType === 'doughnut'" viewBox="0 0 60 60" class="chart-mini-preview__svg" aria-hidden="true">
			<g transform="translate(30, 30)" class="chart-mini-preview__slices">
				<path
					d="M0,-26 A26,26 0 0,1 22.5,13 L13.5,7.8 A15.6,15.6 0 0,0 0,-15.6 Z"
					class="chart-mini-preview__shape--1"
				/>
				<path
					d="M22.5,13 A26,26 0 0,1 -22.5,13 L-13.5,7.8 A15.6,15.6 0 0,0 13.5,7.8 Z"
					class="chart-mini-preview__shape--2"
				/>
				<path
					d="M-22.5,13 A26,26 0 0,1 0,-26 L0,-15.6 A15.6,15.6 0 0,0 -13.5,7.8 Z"
					class="chart-mini-preview__shape--3"
				/>
			</g>
		</svg>

		<svg v-else viewBox="0 0 60 60" class="chart-mini-preview__svg" aria-hidden="true">
			<g transform="translate(30, 30)" class="chart-mini-preview__slices">
				<path d="M0,0 L0,-26 A26,26 0 0,1 24.7,-8 Z" class="chart-mini-preview__shape--1" />
				<path d="M0,0 L17,-5.5 A18,18 0 0,1 5.5,17 Z" class="chart-mini-preview__shape--2" />
				<path d="M0,0 L4.7,14.5 A15,15 0 0,1 -14.5,4.7 Z" class="chart-mini-preview__shape--3" />
				<path d="M0,0 L-20,6.5 A21,21 0 0,1 -6.5,-20 Z" class="chart-mini-preview__shape--4" />
				<path d="M0,0 L-4.8,-15 A16,16 0 0,1 0,-16 Z" class="chart-mini-preview__shape--5" />
			</g>
		</svg>
	</div>
</template>

<style scoped>
.chart-mini-preview {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

.chart-mini-preview__svg {
	width: 100%;
	height: 100%;
	max-width: 120px;
	max-height: 80px;
}

.chart-mini-preview__shape--1 {
	fill: var(--color-accent);
}

.chart-mini-preview__shape--2 {
	fill: color-mix(in srgb, var(--color-accent) 55%, var(--color-hot));
}

.chart-mini-preview__shape--3 {
	fill: var(--color-hot);
}

.chart-mini-preview__shape--4 {
	fill: var(--color-warning);
}

.chart-mini-preview__shape--5 {
	fill: var(--color-success);
}

.chart-mini-preview__slices path {
	stroke: var(--color-paper);
	stroke-width: 1;
}

.chart-mini-preview__line {
	stroke: var(--color-accent);
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.chart-mini-preview__area {
	fill: color-mix(in srgb, var(--color-accent) 15%, transparent);
}

.chart-mini-preview__dot {
	fill: var(--color-accent);
}

.chart-mini-preview__gradient-start {
	stop-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
}

.chart-mini-preview__gradient-end {
	stop-color: transparent;
}
</style>
