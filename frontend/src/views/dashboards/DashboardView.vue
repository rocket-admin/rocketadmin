<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/dashboard-view: one dashboard
// (/dashboards/:connectionId/:dashboardId) as a 12-column grid of panels. In edit mode panels can be
// dragged by their header and resized; each changed position is saved. grid-layout-plus replaces
// angular-gridster2 (GridType.Fit, no compaction, items pushed out of the way).
import { GridItem, GridLayout, type Layout } from 'grid-layout-plus';
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { trackDashboardsEvent } from '@/components/dashboards/analytics';
import PanelDeleteDialog from '@/components/dashboards/PanelDeleteDialog.vue';
import PanelEditDialog from '@/components/dashboards/PanelEditDialog.vue';
import DashboardPanel from '@/components/dashboards/panels/DashboardPanel.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiIcon, UiIconButton, UiMenu, UiMenuItem, UiSpinner, UiSwitch } from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import type { DashboardWidget } from '@/models/dashboard';
import type { SavedQuery } from '@/models/saved-query';
import { useConnectionsStore } from '@/stores/connections';
import { useDashboardQuery, useDashboardsStore } from '@/stores/dashboards';

const COLUMNS = 12;
/** gridster's minRows: the grid is never shorter than this many rows. */
const MIN_ROWS = 8;
const MARGIN = 10;
/** Row height until the container has been measured (and in jsdom, which has no layout). */
const FALLBACK_ROW_HEIGHT = 80;

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const connections = useConnectionsStore();
const dashboards = useDashboardsStore();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const dashboardId = computed(() => String(route.params.dashboardId ?? ''));
const { dashboard, loading, refresh } = useDashboardQuery(connectionId, dashboardId);

const editMode = ref(false);
/** grid-layout-plus mutates these in place while dragging and resizing. */
const layout = ref<Layout>([]);
/** Saved query names by widget id, reported by each panel once loaded. */
const panelNames = ref<Record<string, string>>({});

const widgetsById = computed(() => new Map((dashboard.value?.widgets ?? []).map((widget) => [widget.id, widget])));
/** Each grid item with the widget it places. */
const panels = computed(() =>
	layout.value.flatMap((item) => {
		const widget = widgetsById.value.get(String(item.i));
		return widget ? [{ item, widget }] : [];
	}),
);

watch(
	dashboard,
	(value) => {
		layout.value = (value?.widgets ?? []).map((widget) => ({
			i: widget.id,
			x: widget.position_x,
			y: widget.position_y,
			w: widget.width,
			h: widget.height,
		}));
	},
	{ immediate: true },
);

watchEffect(() => {
	if (dashboard.value) document.title = `${dashboard.value.name} | ${connections.connectionTitle || 'Rocketadmin'}`;
});

// GridType.Fit: rows stretch so the grid fills the height of its container.
const gridHost = ref<HTMLElement | null>(null);
const hostHeight = ref(0);
const resizeObserver = new ResizeObserver((entries) => {
	hostHeight.value = entries[0]?.contentRect.height ?? 0;
});
watch(gridHost, (el, previous) => {
	if (previous) resizeObserver.unobserve(previous);
	if (el) resizeObserver.observe(el);
});
onBeforeUnmount(() => resizeObserver.disconnect());

const rowHeight = computed(() => {
	const rows = Math.max(MIN_ROWS, ...layout.value.map((item) => item.y + item.h));
	if (!hostHeight.value) return FALLBACK_ROW_HEIGHT;
	return Math.max(MARGIN * 2, (hostHeight.value - MARGIN * (rows + 1)) / rows);
});

function toggleEditMode(value: boolean): void {
	editMode.value = value;
	trackDashboardsEvent(`Dashboards: edit mode ${editMode.value ? 'enabled' : 'disabled'}`);
}

async function openAddPanelDialog(): Promise<void> {
	const dialogRef = dialog.open<boolean>(PanelEditDialog, {
		data: { connectionId: connectionId.value, dashboardId: dashboardId.value, widget: null },
	});
	trackDashboardsEvent('Dashboards: add panel dialog opened');
	if (await dialogRef.afterClosed()) refresh();
}

async function openEditPanelDialog(widget: DashboardWidget): Promise<void> {
	const dialogRef = dialog.open<boolean>(PanelEditDialog, {
		data: { connectionId: connectionId.value, dashboardId: dashboardId.value, widget },
	});
	trackDashboardsEvent('Dashboards: edit panel dialog opened');
	if (await dialogRef.afterClosed()) refresh();
}

async function openDeletePanelDialog(widget: DashboardWidget): Promise<void> {
	const dialogRef = dialog.open<boolean>(PanelDeleteDialog, {
		data: { connectionId: connectionId.value, dashboardId: dashboardId.value, widget },
	});
	trackDashboardsEvent('Dashboards: delete panel dialog opened');
	if (await dialogRef.afterClosed()) refresh();
}

function navigateBack(): void {
	router.push(`/dashboards/${connectionId.value}`);
}

function onPanelLoaded(widgetId: string, query: SavedQuery | null): void {
	panelNames.value = { ...panelNames.value, [widgetId]: query?.name ?? '' };
}

/** gridster's itemChangeCallback: saves every panel whose position or size changed. */
async function onLayoutUpdated(updated: Layout): Promise<void> {
	for (const item of updated) {
		const widget = widgetsById.value.get(String(item.i));
		if (!widget) continue;
		if (
			widget.position_x === item.x &&
			widget.position_y === item.y &&
			widget.width === item.w &&
			widget.height === item.h
		) {
			continue;
		}
		// Update the local widget first so the next layout update doesn't save it again.
		widget.position_x = item.x;
		widget.position_y = item.y;
		widget.width = item.w;
		widget.height = item.h;
		try {
			await dashboards.updateWidgetPosition(connectionId.value, dashboardId.value, widget.id, {
				position_x: widget.position_x,
				position_y: widget.position_y,
				width: widget.width,
				height: widget.height,
			});
		} catch {
			// The client has shown the error.
		}
	}
}
</script>

<template>
	<div class="dashboard-view">
		<AppAlert />

		<div class="dashboard-view__header">
			<div class="dashboard-view__header-start">
				<UiIconButton icon="arrow_back" label="Back to dashboards" @click="navigateBack" />
				<div>
					<h1 class="dashboard-view__title">{{ dashboard?.name || 'Loading...' }}</h1>
					<p v-if="dashboard?.description" class="dashboard-view__description">{{ dashboard.description }}</p>
				</div>
			</div>
			<div v-if="layout.length > 0" class="dashboard-view__actions">
				<UiSwitch :model-value="editMode" data-testid="edit-mode-toggle" @update:model-value="toggleEditMode">
					Edit mode
				</UiSwitch>
				<UiButton data-testid="add-panel-button" @click="openAddPanelDialog">
					<template #leading><UiIcon name="add" size="sm" /></template>
					Add panel
				</UiButton>
			</div>
		</div>

		<div v-if="loading" class="dashboard-view__loading">
			<UiSpinner size="lg" label="Loading dashboard" />
		</div>

		<div v-else-if="layout.length === 0" class="dashboard-view__empty">
			<UiIcon name="bar_chart" size="lg" class="dashboard-view__empty-icon" />
			<h3 class="dashboard-view__empty-title">No panels yet</h3>
			<p class="dashboard-view__empty-text">Add panels to visualize your data from saved queries.</p>
			<UiButton @click="openAddPanelDialog">
				<template #leading><UiIcon name="add" size="sm" /></template>
				Add panel
			</UiButton>
		</div>

		<div v-else ref="gridHost" class="dashboard-view__grid" :class="{ 'dashboard-view__grid--edit': editMode }">
			<GridLayout
				v-model:layout="layout"
				:col-num="COLUMNS"
				:row-height="rowHeight"
				:max-rows="100"
				:margin="[MARGIN, MARGIN]"
				:is-draggable="editMode"
				:is-resizable="editMode"
				:vertical-compact="false"
				@layout-updated="onLayoutUpdated"
			>
				<GridItem
					v-for="{ item, widget } in panels"
					:key="item.i"
					:i="item.i"
					:x="item.x"
					:y="item.y"
					:w="item.w"
					:h="item.h"
					:min-w="2"
					:min-h="2"
					:max-w="12"
					:max-h="12"
					drag-allow-from=".dashboard-view__panel-header"
					drag-ignore-from="a, button"
					class="dashboard-view__panel"
					:class="{ 'dashboard-view__panel--edit': editMode }"
					:data-testid="`panel-${widget.id}`"
				>
					<div class="dashboard-view__panel-header">
						<span class="dashboard-view__panel-title">{{ panelNames[widget.id] || 'Loading...' }}</span>
						<UiMenu label="Panel actions" align="end">
							<template #trigger="{ triggerProps }">
								<UiIconButton v-bind="triggerProps" icon="more_vert" label="Panel actions" size="sm" />
							</template>
							<UiMenuItem icon="tune" :to="`/panels/${connectionId}/${widget.query_id}`">Configure panel</UiMenuItem>
							<UiMenuItem icon="swap_horiz" @select="openEditPanelDialog(widget)">Change query</UiMenuItem>
							<UiMenuItem icon="delete" variant="danger" @select="openDeletePanelDialog(widget)">Delete</UiMenuItem>
						</UiMenu>
					</div>
					<div class="dashboard-view__panel-content">
						<DashboardPanel
							:widget="widget"
							:connection-id="connectionId"
							@loaded="onPanelLoaded(widget.id, $event)"
						/>
					</div>
				</GridItem>
			</GridLayout>
		</div>
	</div>
</template>

<style scoped>
.dashboard-view {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	height: calc(100vh - var(--header-height) - var(--footer-height));
	padding: var(--space-6);
	background: var(--color-paper);
}

.dashboard-view__header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
	margin-bottom: var(--space-6);
}

.dashboard-view__header-start {
	display: flex;
	align-items: center;
	gap: var(--space-2);
}

.dashboard-view__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	line-height: var(--leading-tight);
	color: var(--color-ink);
}

.dashboard-view__description {
	margin: var(--space-1) 0 0;
	font-size: var(--text-sm);
	color: var(--color-muted);
}

.dashboard-view__actions {
	display: flex;
	align-items: center;
	gap: var(--space-4);
}

.dashboard-view__loading {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
}

.dashboard-view__empty {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--space-16) var(--space-6);
	border-radius: var(--radius-panel);
	background: var(--color-paper-2);
	text-align: center;
}

.dashboard-view__empty-icon {
	margin-bottom: var(--space-4);
	color: var(--color-muted-soft);
}

.dashboard-view__empty-title {
	margin: 0 0 var(--space-2);
	color: var(--color-ink);
}

.dashboard-view__empty-text {
	margin: 0 0 var(--space-4);
	color: var(--color-muted);
}

.dashboard-view__grid {
	flex: 1;
	min-height: 0;
	overflow: auto;
	border-radius: var(--radius-panel);
	background: var(--color-paper-2);
}

.dashboard-view__grid :deep(.vgl-layout) {
	--vgl-placeholder-bg: var(--color-accent);
	--vgl-resizer-border-color: var(--color-accent);
}

.dashboard-view__panel {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border-radius: var(--radius-panel);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
}

.dashboard-view__panel--edit {
	border: 2px dashed var(--color-accent);
}

.dashboard-view__panel-header {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: space-between;
	padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
	border-bottom: 1px solid var(--color-line);
}

.dashboard-view__panel--edit .dashboard-view__panel-header {
	cursor: move;
}

.dashboard-view__panel-title {
	overflow: hidden;
	font-size: var(--text-sm);
	font-weight: var(--weight-medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.dashboard-view__panel-content {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	padding: var(--space-4);
	overflow: auto;
}

@media (width <= 600px) {
	.dashboard-view {
		padding: var(--space-4);
	}

	.dashboard-view__header {
		flex-direction: column;
		align-items: flex-start;
	}

	.dashboard-view__actions {
		justify-content: space-between;
		width: 100%;
	}
}
</style>
