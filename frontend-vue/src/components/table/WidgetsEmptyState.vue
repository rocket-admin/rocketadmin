<script setup lang="ts">
// Port of frontend/src/app/components/dashboard/db-table-view/db-table-widgets/widgets-empty-state:
// the widgets page with no widgets yet. A demo table turns its raw values into widgets one row at a
// time (600ms apart, holding 2.2s, then restarting), next to a grid of the available widgets.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { UiButton, UiIcon } from '@/components/ui';
import { trackTableEvent } from './analytics';

const emit = defineEmits<{ addWidget: [] }>();

const demoRows = [
	{ column: 'is_active', raw: '1', widget: 'Yes', icon: 'check_circle', tone: 'green', badge: 'Boolean' },
	{ column: 'price', raw: '9900', widget: 'USD 99.00', icon: null, tone: 'amber', badge: 'Money' },
	{
		column: 'website',
		raw: 'https://rocketadmin.com',
		widget: 'rocketadmin.com',
		icon: 'link',
		tone: 'purple',
		badge: 'URL',
	},
	{ column: 'country', raw: 'US', widget: '🇺🇸 United States', icon: null, tone: 'blue', badge: 'Country' },
];

const widgetCards = [
	{ icon: 'image', name: 'Image', desc: 'Photo preview' },
	{ icon: 'toggle_on', name: 'Boolean', desc: 'Yes / No' },
	{ icon: 'payments', name: 'Money', desc: 'Currency format' },
	{ icon: 'flag', name: 'Country', desc: 'Country picker' },
	{ icon: 'link', name: 'URL', desc: 'Clickable link' },
	{ icon: 'list', name: 'Select', desc: 'Dropdown list' },
	{ icon: 'event', name: 'Date', desc: 'Date picker' },
	{ icon: 'palette', name: 'Color', desc: 'Color picker' },
	{ icon: 'phone', name: 'Phone', desc: 'Phone format' },
	{ icon: 'code', name: 'Code', desc: 'Syntax highlight' },
	{ icon: 'tag', name: 'Number', desc: 'Numeric display' },
	{ icon: 'linear_scale', name: 'Range', desc: 'Slider input' },
	{ icon: 'password', name: 'Password', desc: 'Hidden text' },
	{ icon: 'notes', name: 'Textarea', desc: 'Multi-line text' },
	{ icon: 'fingerprint', name: 'UUID', desc: 'Auto-generate' },
	{ icon: 'cloud_upload', name: 'S3', desc: 'File storage' },
	{ icon: 'vpn_key', name: 'Foreign key', desc: 'Linked record' },
	{ icon: 'text_fields', name: 'String', desc: 'Text validation' },
];

const animatedRows = ref([false, false, false, false]);
let timers: ReturnType<typeof setTimeout>[] = [];

function runAnimationCycle() {
	for (let index = 0; index < 4; index++) {
		timers.push(
			setTimeout(() => {
				animatedRows.value[index] = true;
			}, index * 600),
		);
	}
	timers.push(
		setTimeout(
			() => {
				animatedRows.value = [false, false, false, false];
				timers.push(setTimeout(runAnimationCycle, 800));
			},
			3 * 600 + 2200,
		),
	);
}

function clearTimers() {
	for (const timer of timers) clearTimeout(timer);
	timers = [];
}

onMounted(() => {
	clearTimers();
	runAnimationCycle();
});
onBeforeUnmount(clearTimers);

function addWidget() {
	trackTableEvent('Widgets: add first widget is clicked');
	emit('addWidget');
}
</script>

<template>
	<div class="widgets-empty">
		<div class="widgets-empty__left">
			<div class="widgets-empty__icon-box"><UiIcon name="tune" /></div>
			<h2 class="widgets-empty__title">Make your data easier to read and edit</h2>
			<p class="widgets-empty__subtitle">
				By default every column shows <strong>raw text</strong>. Widgets change how a column is
				<strong>displayed and edited</strong> — without modifying the database.
			</p>

			<div class="widgets-empty__demo" aria-hidden="true">
				<div class="widgets-empty__demo-header">
					<span>Column</span>
					<span>Value</span>
				</div>
				<div
					v-for="(row, index) in demoRows"
					:key="row.column"
					:class="['widgets-empty__demo-row', { 'widgets-empty__demo-row--widget': animatedRows[index] }]"
				>
					<span class="widgets-empty__demo-col">{{ row.column }}</span>
					<span class="widgets-empty__demo-value">
						<span class="widgets-empty__demo-raw">{{ row.raw }}</span>
						<span :class="['widgets-empty__demo-widget', `widgets-empty__demo-widget--${row.tone}`]">
							<UiIcon v-if="row.icon" :name="row.icon" size="sm" />
							{{ row.widget }}
						</span>
					</span>
					<span class="widgets-empty__badge">{{ row.badge }}</span>
				</div>
			</div>

			<div class="widgets-empty__cta">
				<UiButton data-testid="create-first-widget-button" @click="addWidget">Create first widget</UiButton>
				<a
					class="widgets-empty__docs"
					href="https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_definition"
					target="_blank"
					rel="noopener noreferrer"
				>
					Docs <UiIcon name="open_in_new" size="sm" />
				</a>
			</div>
		</div>

		<div class="widgets-empty__divider" />

		<div class="widgets-empty__right">
			<span class="widgets-empty__grid-label">Available widgets</span>
			<div class="widgets-empty__grid">
				<div v-for="card in widgetCards" :key="card.name" class="widgets-empty__card">
					<UiIcon :name="card.icon" class="widgets-empty__card-icon" />
					<span class="widgets-empty__card-name">{{ card.name }}</span>
					<span class="widgets-empty__card-desc">{{ card.desc }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.widgets-empty {
	display: flex;
	gap: var(--space-8);
	margin: var(--space-6) 0;
}

.widgets-empty__left,
.widgets-empty__right {
	flex: 1;
	min-width: 0;
}

.widgets-empty__icon-box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	margin-bottom: var(--space-4);
	border-radius: var(--radius-control);
	color: var(--color-accent);
	background: var(--color-paper-2);
}

.widgets-empty__title {
	margin: 0 0 var(--space-2);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.widgets-empty__subtitle {
	margin: 0 0 var(--space-5);
	color: var(--color-muted);
	line-height: var(--leading-relaxed);
}

.widgets-empty__demo {
	border: 1px solid var(--color-line);
	border-radius: var(--radius-card);
	overflow: hidden;
}

.widgets-empty__demo-header,
.widgets-empty__demo-row {
	display: grid;
	grid-template-columns: 7rem 1fr auto;
	align-items: center;
	gap: var(--space-3);
	padding: var(--space-2) var(--space-3);
}

.widgets-empty__demo-header {
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
	text-transform: uppercase;
	color: var(--color-muted);
	background: var(--color-paper-2);
}

.widgets-empty__demo-row {
	border-top: 1px solid var(--color-line);
}

.widgets-empty__demo-col {
	font-family: var(--font-mono);
	font-size: var(--text-sm);
	color: var(--color-muted);
}

.widgets-empty__demo-value {
	position: relative;
	display: flex;
	align-items: center;
	min-height: 1.5rem;
}

.widgets-empty__demo-raw,
.widgets-empty__demo-widget {
	transition:
		opacity var(--motion-slow) var(--ease-out),
		transform var(--motion-slow) var(--ease-out);
}

.widgets-empty__demo-raw {
	font-family: var(--font-mono);
	font-size: var(--text-sm);
}

.widgets-empty__demo-widget {
	position: absolute;
	left: 0;
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	padding: var(--space-05) var(--space-2);
	border-radius: var(--radius-pill);
	font-size: var(--text-sm);
	opacity: 0;
	transform: translateY(0.375rem);
}

.widgets-empty__demo-row--widget .widgets-empty__demo-raw {
	opacity: 0;
	transform: translateY(-0.25rem);
}

.widgets-empty__demo-row--widget .widgets-empty__demo-widget {
	opacity: 1;
	transform: translateY(0);
}

.widgets-empty__demo-widget--green {
	color: var(--color-success);
	background: var(--color-success-bg);
}

.widgets-empty__demo-widget--amber {
	color: var(--color-warning);
	background: var(--color-warning-bg);
}

.widgets-empty__demo-widget--purple {
	color: var(--color-hot);
	background: var(--color-paper-2);
}

.widgets-empty__demo-widget--blue {
	color: var(--color-accent);
	background: var(--color-paper-2);
}

.widgets-empty__badge {
	padding: var(--space-05) var(--space-2);
	border-radius: var(--radius-pill);
	font-size: var(--text-2xs);
	color: var(--color-muted);
	background: var(--color-paper-2);
	opacity: 0;
	transition: opacity var(--motion-slow) var(--ease-out);
}

.widgets-empty__demo-row--widget .widgets-empty__badge {
	opacity: 1;
}

.widgets-empty__cta {
	display: flex;
	align-items: center;
	gap: var(--space-4);
	margin-top: var(--space-6);
}

.widgets-empty__docs {
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	color: var(--color-accent);
}

.widgets-empty__divider {
	width: 1px;
	background: var(--color-line);
}

.widgets-empty__grid-label {
	display: block;
	margin-bottom: var(--space-3);
	font-size: var(--text-xs);
	font-weight: var(--weight-semibold);
	text-transform: uppercase;
	color: var(--color-muted);
}

.widgets-empty__grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--space-3);
}

.widgets-empty__card {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	padding: var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	background: var(--color-surface);
}

.widgets-empty__card-icon {
	color: var(--color-accent);
}

.widgets-empty__card-name {
	font-weight: var(--weight-medium);
}

.widgets-empty__card-desc {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

@media (width <= 900px) {
	.widgets-empty {
		flex-direction: column;
	}

	.widgets-empty__divider {
		width: auto;
		height: 1px;
	}
}

@media (width <= 600px) {
	.widgets-empty__grid {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
