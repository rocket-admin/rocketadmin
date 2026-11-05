<script setup lang="ts">
// Port of frontend/src/app/components/edit-database-schema/schema-diagram-viewer: a Mermaid ER
// diagram on a pannable, zoomable canvas, with a searchable list of its tables that focuses one.
//
// Angular rendered the source through ngx-markdown's `mermaid` mode and watched the canvas with a
// MutationObserver for the resulting <svg>. Here Mermaid is imported on first render and its SVG is
// placed directly, so the fit/measure step runs right after the render instead.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { UiIcon, UiIconButton, UiInput } from '@/components/ui';
import { renderMermaid } from './mermaid';

const MIN_RELATIVE = 0.2;
const MAX_RELATIVE = 8;
const ABSOLUTE_MIN = 0.05;
const ABSOLUTE_MAX = 40;
const ZOOM_STEP = 0.25;
/** Space kept around the diagram by "Fit to screen", in px. */
const FIT_PADDING = 24;

const props = withDefaults(
	defineProps<{
		/** Heading above the diagram. */
		title?: string;
		/** Mermaid ER source, optionally wrapped in a ```mermaid fence. */
		source?: string;
	}>(),
	{ title: '', source: '' },
);

const viewport = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLDivElement | null>(null);

const svgMarkup = ref('');
const renderFailed = ref(false);
const scale = ref(1);
const baseScale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isPanning = ref(false);
const tableSearch = ref('');
const sidebarOpen = ref(true);
const svgSize = ref({ w: 0, h: 0 });
const viewportSize = ref({ w: 0, h: 0 });

const code = computed(() => props.source.replace(/^```mermaid\n?/i, '').replace(/```\s*$/i, ''));

const tables = computed(() => {
	const names: string[] = [];
	const seen = new Set<string>();
	for (const rawLine of code.value.split('\n')) {
		const name = rawLine.match(/^\s*([A-Za-z_][\w-]*)\s*\{/)?.[1];
		if (name && !seen.has(name)) {
			seen.add(name);
			names.push(name);
		}
	}
	return names.sort((a, b) => a.localeCompare(b));
});

const filteredTables = computed(() => {
	const q = tableSearch.value.toLowerCase().trim();
	return q ? tables.value.filter((t) => t.toLowerCase().includes(q)) : tables.value;
});

const transformStyle = computed(() => `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`);

const scaleLabel = computed(() => `${Math.round((scale.value / (baseScale.value || 1)) * 100)}%`);

let panStart = { x: 0, y: 0, tx: 0, ty: 0 };
let resizeObserver: ResizeObserver | null = null;
let renderRun = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();

watch(
	() => props.source,
	() => {
		svgSize.value = { w: 0, h: 0 };
		scale.value = 1;
		baseScale.value = 1;
		translateX.value = 0;
		translateY.value = 0;
		render();
	},
);

onMounted(() => {
	render();
	const element = viewport.value;
	if (!element) return;
	resizeObserver = new ResizeObserver(() => {
		const rect = element.getBoundingClientRect();
		viewportSize.value = { w: rect.width, h: rect.height };
	});
	resizeObserver.observe(element);
});

onBeforeUnmount(() => {
	renderRun++;
	resizeObserver?.disconnect();
	for (const timer of timers) clearTimeout(timer);
	document.removeEventListener('mousemove', onPanMove);
	document.removeEventListener('mouseup', onPanEnd);
});

function zoomIn() {
	zoomAt(scale.value + baseScale.value * ZOOM_STEP);
}

function zoomOut() {
	zoomAt(scale.value - baseScale.value * ZOOM_STEP);
}

function fitToScreen() {
	let vp = viewportSize.value;
	if (!vp.w || !vp.h) {
		const rect = viewport.value?.getBoundingClientRect();
		if (rect?.width && rect.height) {
			vp = { w: rect.width, h: rect.height };
			viewportSize.value = vp;
		}
	}
	const svg = svgSize.value;
	if (!vp.w || !svg.w) return;
	const fit = Math.min((vp.w - FIT_PADDING * 2) / svg.w, (vp.h - FIT_PADDING * 2) / svg.h);
	const newScale = Math.max(ABSOLUTE_MIN, Math.min(ABSOLUTE_MAX, fit));
	baseScale.value = newScale;
	scale.value = newScale;
	translateX.value = (vp.w - svg.w * newScale) / 2;
	translateY.value = (vp.h - svg.h * newScale) / 2;
}

function onPanStart(event: MouseEvent) {
	const target = event.target as HTMLElement;
	if (target.closest('button, a, input, .schema-diagram__sidebar, .schema-diagram__toolbar')) return;
	isPanning.value = true;
	panStart = { x: event.clientX, y: event.clientY, tx: translateX.value, ty: translateY.value };
	document.addEventListener('mousemove', onPanMove);
	document.addEventListener('mouseup', onPanEnd);
	event.preventDefault();
}

function onWheel(event: WheelEvent) {
	event.preventDefault();
	const rect = viewport.value?.getBoundingClientRect();
	if (!rect) return;
	const factor = 1 - event.deltaY * 0.0025;
	zoomAt(scale.value * factor, event.clientX - rect.left, event.clientY - rect.top);
}

function onDoubleClick(event: MouseEvent) {
	const target = event.target as Element | null;
	if (!target) return;
	const node = findEntityNode(target);
	if (node) focusElement(node);
}

function focusTable(name: string) {
	const node = findNodeByName(name);
	if (node) focusElement(node);
}

async function render() {
	const run = ++renderRun;
	renderFailed.value = false;
	if (!code.value.trim()) {
		svgMarkup.value = '';
		return;
	}
	let svg: string;
	try {
		svg = await renderMermaid(code.value);
	} catch {
		if (run !== renderRun) return;
		svgMarkup.value = '';
		renderFailed.value = true;
		return;
	}
	if (run !== renderRun) return;
	svgMarkup.value = svg;
	await nextTick();
	const element = canvas.value?.querySelector('svg');
	if (!element) return;
	prepareSvg(element);
	requestAnimationFrame(() => fitToScreen());
	later(() => fitToScreen(), 80);
}

function onPanMove(event: MouseEvent) {
	translateX.value = panStart.tx + event.clientX - panStart.x;
	translateY.value = panStart.ty + event.clientY - panStart.y;
}

function onPanEnd() {
	isPanning.value = false;
	document.removeEventListener('mousemove', onPanMove);
	document.removeEventListener('mouseup', onPanEnd);
}

function zoomAt(targetScale: number, originX?: number, originY?: number) {
	const base = baseScale.value || 1;
	const minAbs = Math.max(ABSOLUTE_MIN, base * MIN_RELATIVE);
	const maxAbs = Math.min(ABSOLUTE_MAX, base * MAX_RELATIVE);
	const clamped = Math.max(minAbs, Math.min(maxAbs, targetScale));
	const oldScale = scale.value;
	if (clamped === oldScale) return;
	const ox = originX ?? viewportSize.value.w / 2;
	const oy = originY ?? viewportSize.value.h / 2;
	const ratio = clamped / oldScale;
	translateX.value = ox - (ox - translateX.value) * ratio;
	translateY.value = oy - (oy - translateY.value) * ratio;
	scale.value = clamped;
}

function prepareSvg(svg: SVGSVGElement) {
	svg.removeAttribute('style');
	svg.style.display = 'block';
	svg.style.maxWidth = 'none';
	svg.style.maxHeight = 'none';
	svg.style.height = 'auto';
	svg.style.margin = '0';

	const measure = () => {
		const rect = svg.getBoundingClientRect();
		const currentScale = scale.value || 1;
		let width = rect.width / currentScale;
		let height = rect.height / currentScale;
		if (!width || !height) {
			// jsdom has no getBBox.
			const bbox = typeof svg.getBBox === 'function' ? svg.getBBox() : null;
			width = width || bbox?.width || 800;
			height = height || bbox?.height || 600;
		}
		svgSize.value = { w: width, h: height };
	};
	measure();
	requestAnimationFrame(measure);
}

function findEntityNode(target: Element): SVGGraphicsElement | null {
	for (const selector of ['g.node', 'g.er', 'g[id^="entity-"]', 'g.entity', 'g.classGroup']) {
		const match = target.closest(selector);
		if (match) return match as SVGGraphicsElement;
	}
	return null;
}

function findNodeByName(name: string): SVGGraphicsElement | null {
	const svg = canvas.value?.querySelector('svg');
	if (!svg) return null;
	const target = name.toLowerCase();
	for (const label of svg.querySelectorAll('text, .er .entityLabel, .nodeLabel')) {
		if ((label.textContent ?? '').trim().toLowerCase() !== target) continue;
		const node = (label.closest('g[id], g.node, g.er, g.entity') ?? label.parentElement) as SVGGraphicsElement | null;
		if (node) return node;
	}
	return null;
}

function focusElement(node: SVGGraphicsElement) {
	const element = viewport.value;
	if (!element) return;
	const vpRect = element.getBoundingClientRect();
	const nodeRect = node.getBoundingClientRect();
	const targetScale = Math.max(scale.value, 1.2);
	const ratio = targetScale / scale.value;
	const nodeCenterX = nodeRect.left - vpRect.left + nodeRect.width / 2;
	const nodeCenterY = nodeRect.top - vpRect.top + nodeRect.height / 2;
	const newCenterX = nodeCenterX * ratio + translateX.value * (ratio - 1);
	const newCenterY = nodeCenterY * ratio + translateY.value * (ratio - 1);
	scale.value = targetScale;
	translateX.value += vpRect.width / 2 - newCenterX;
	translateY.value += vpRect.height / 2 - newCenterY;
	node.classList.add('schema-diagram__highlight');
	later(() => node.classList.remove('schema-diagram__highlight'), 1600);
}

function later(callback: () => void, ms: number) {
	const timer = setTimeout(() => {
		timers.delete(timer);
		callback();
	}, ms);
	timers.add(timer);
}
</script>

<template>
	<div class="schema-diagram" :class="{ 'schema-diagram--panning': isPanning }">
		<div class="schema-diagram__header">
			<h3 class="schema-diagram__title">{{ title }}</h3>
			<div class="schema-diagram__toolbar">
				<UiIconButton
					icon="list"
					label="Toggle tables list"
					size="sm"
					:variant="sidebarOpen ? 'secondary' : 'ghost'"
					:aria-pressed="sidebarOpen ? 'true' : 'false'"
					data-testid="schema-diagram-sidebar-toggle"
					@click="sidebarOpen = !sidebarOpen"
				/>
				<span class="schema-diagram__toolbar-divider" aria-hidden="true" />
				<UiIconButton icon="remove" label="Zoom out" size="sm" @click="zoomOut" />
				<span class="schema-diagram__zoom-label" data-testid="schema-diagram-zoom">{{ scaleLabel }}</span>
				<UiIconButton icon="add" label="Zoom in" size="sm" @click="zoomIn" />
				<UiIconButton icon="fit_screen" label="Fit to screen" size="sm" @click="fitToScreen" />
				<UiIconButton icon="restart_alt" label="Reset view" size="sm" @click="fitToScreen" />
			</div>
		</div>

		<div class="schema-diagram__body">
			<div
				ref="viewport"
				class="schema-diagram__viewport"
				@mousedown="onPanStart"
				@wheel="onWheel"
				@dblclick="onDoubleClick"
			>
				<!-- Mermaid's own SVG output (securityLevel "strict": labels are sanitized by Mermaid). -->
				<div
					ref="canvas"
					class="schema-diagram__canvas"
					:style="{ transform: transformStyle }"
					data-testid="schema-diagram-canvas"
					v-html="svgMarkup"
				/>
				<p v-if="renderFailed" class="schema-diagram__error">The diagram could not be rendered.</p>

				<aside v-if="sidebarOpen" class="schema-diagram__sidebar" aria-label="Tables" @wheel.stop>
					<div class="schema-diagram__sidebar-search">
						<UiIcon name="search" size="sm" class="schema-diagram__sidebar-search-icon" />
						<UiInput
							v-model="tableSearch"
							type="search"
							size="sm"
							placeholder="Search tables"
							aria-label="Search tables"
							class="schema-diagram__sidebar-input"
						/>
					</div>
					<div class="schema-diagram__sidebar-list">
						<button
							v-for="table in filteredTables"
							:key="table"
							type="button"
							class="schema-diagram__sidebar-item"
							@click="focusTable(table)"
						>
							<UiIcon name="table_chart" size="sm" class="schema-diagram__sidebar-item-icon" />
							<span class="schema-diagram__sidebar-item-name">{{ table }}</span>
						</button>
						<p v-if="filteredTables.length === 0" class="schema-diagram__sidebar-empty">
							No tables match your search.
						</p>
					</div>
				</aside>
			</div>
		</div>
	</div>
</template>

<style scoped>
.schema-diagram {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-paper-2);
	overflow: hidden;
}

.schema-diagram__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: var(--space-3);
	padding: var(--space-2) var(--space-3);
	border-bottom: 1px solid var(--color-line);
	background: var(--color-surface);
}

.schema-diagram__title {
	margin: 0;
	font-size: var(--text-sm);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.schema-diagram__toolbar {
	display: flex;
	align-items: center;
	gap: var(--space-05);
}

.schema-diagram__toolbar-divider {
	width: 1px;
	height: var(--space-5);
	margin: 0 var(--space-1);
	background: var(--color-line-strong);
}

.schema-diagram__zoom-label {
	min-width: 2.75rem;
	font-size: var(--text-xs);
	text-align: center;
	color: var(--color-muted);
	user-select: none;
	font-variant-numeric: tabular-nums;
}

.schema-diagram__body {
	flex: 1;
	display: flex;
	min-height: 0;
}

.schema-diagram__viewport {
	flex: 1;
	position: relative;
	overflow: hidden;
	cursor: grab;
	background-image: radial-gradient(circle, var(--color-line) 1px, transparent 1px);
	background-size: 18px 18px;
}

.schema-diagram--panning .schema-diagram__viewport {
	cursor: grabbing;
}

.schema-diagram__canvas {
	position: absolute;
	top: 0;
	left: 0;
	transform-origin: 0 0;
	will-change: transform;
	line-height: 0;
}

.schema-diagram__canvas :deep(svg) {
	display: block;
	max-width: none !important;
	max-height: none !important;
	margin: 0 !important;
}

.schema-diagram__canvas :deep(.schema-diagram__highlight) {
	animation: schema-diagram-highlight 1.6s var(--ease-out);
}

@keyframes schema-diagram-highlight {
	0% {
		filter: drop-shadow(0 0 0 transparent);
	}
	30% {
		filter: drop-shadow(0 0 14px var(--color-accent));
	}
	100% {
		filter: drop-shadow(0 0 0 transparent);
	}
}

.schema-diagram__error {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0;
	font-size: var(--text-sm);
	color: var(--color-muted);
}

.schema-diagram__sidebar {
	position: absolute;
	top: var(--space-3);
	left: var(--space-3);
	z-index: var(--z-sticky);
	display: flex;
	flex-direction: column;
	width: 13.75rem;
	max-height: calc(100% - var(--space-6));
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	background: var(--color-surface-raised);
	box-shadow: var(--shadow-card);
	overflow: hidden;
	cursor: default;
}

.schema-diagram__sidebar-search {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-2);
	border-bottom: 1px solid var(--color-line);
}

.schema-diagram__sidebar-search-icon {
	flex-shrink: 0;
	color: var(--color-muted);
}

.schema-diagram__sidebar-input {
	flex: 1;
	min-width: 0;
}

.schema-diagram__sidebar-list {
	display: flex;
	flex-direction: column;
	gap: var(--space-05);
	padding: var(--space-1);
	overflow-y: auto;
}

.schema-diagram__sidebar-item {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	width: 100%;
	padding: var(--space-1) var(--space-2);
	border: none;
	border-radius: var(--radius-control);
	background: none;
	font: inherit;
	font-size: var(--text-sm);
	text-align: left;
	color: var(--color-ink);
	cursor: pointer;
	transition: background-color var(--motion-fast) var(--ease-out);
}

.schema-diagram__sidebar-item:hover {
	background-color: var(--color-paper-2);
}

.schema-diagram__sidebar-item:focus-visible {
	outline: none;
	box-shadow: var(--shadow-focus);
}

.schema-diagram__sidebar-item-icon {
	flex-shrink: 0;
	color: var(--color-muted);
}

.schema-diagram__sidebar-empty {
	margin: var(--space-3);
	font-size: var(--text-xs);
	text-align: center;
	color: var(--color-muted);
}
</style>
