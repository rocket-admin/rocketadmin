<script setup lang="ts">
// Port of frontend/src/app/components/charts/charts-list: the panels (saved queries) of a
// connection, at /panels/:connectionId. Searchable by name and description; a row opens the editor.
import { computed, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChartDeleteDialog from '@/components/charts/ChartDeleteDialog.vue';
import { trackDashboardsEvent } from '@/components/dashboards/analytics';
import ChartMiniPreview from '@/components/dashboards/ChartMiniPreview.vue';
import DashboardsSidebar from '@/components/dashboards/DashboardsSidebar.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import PlaceholderTableData from '@/components/skeletons/PlaceholderTableData.vue';
import {
	type TableColumn,
	UiButton,
	UiDivider,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiMenu,
	UiMenuItem,
	UiTable,
	vTooltip,
} from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import type { ChartType, SavedQuery } from '@/models/saved-query';
import { useConnectionsStore } from '@/stores/connections';
import { useSavedQueriesQuery } from '@/stores/saved-queries';

const CHART_TYPE_NAMES: Record<ChartType, string> = {
	bar: 'Bar Chart',
	line: 'Line Chart',
	pie: 'Pie Chart',
	doughnut: 'Doughnut Chart',
	polarArea: 'Polar Area Chart',
};

const COLUMNS: TableColumn<SavedQuery>[] = [
	{ key: 'preview', label: 'Type', width: '4rem' },
	{ key: 'name', label: 'Name' },
	{ key: 'description', label: 'Description' },
	{ key: 'updated', label: 'Updated' },
];

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const connections = useConnectionsStore();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const { savedQueries, loading } = useSavedQueriesQuery(connectionId);
const searchQuery = ref('');

const filteredQueries = computed(() => {
	const search = searchQuery.value;
	if (!search) return savedQueries.value;
	const query = search.toLowerCase();
	return savedQueries.value.filter(
		(q) => q.name.toLowerCase().includes(query) || q.description?.toLowerCase().includes(query),
	);
});

watchEffect(() => {
	document.title = `Charts | ${connections.connectionTitle || 'Rocketadmin'}`;
});

function getChartTypeName(chartType: ChartType | null): string {
	return chartType ? CHART_TYPE_NAMES[chartType] : 'Bar Chart';
}

function trackCreatePageOpened(): void {
	trackDashboardsEvent('Charts: create chart page opened');
}

function trackEditPageOpened(): void {
	trackDashboardsEvent('Charts: edit chart page opened');
}

function openQuery(query: SavedQuery): void {
	trackEditPageOpened();
	router.push(`/panels/${connectionId.value}/${query.id}`);
}

function openDeleteDialog(query: SavedQuery): void {
	dialog.open(ChartDeleteDialog, { data: { query, connectionId: connectionId.value } });
	trackDashboardsEvent('Charts: delete chart dialog opened');
}

function formatUpdatedAt(date: string): string {
	const now = new Date();
	const updated = new Date(date);
	const diffMs = now.getTime() - updated.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins} min ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

	return updated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<template>
	<div class="charts-list">
		<DashboardsSidebar :connection-id="connectionId" active-tab="queries" />

		<div class="charts-list__main">
			<AppAlert />

			<div class="charts-list__page">
				<header class="charts-list__header">
					<h1 class="charts-list__title">Panels</h1>
					<p class="charts-list__description">
						Create and manage panels with chart visualizations for your dashboards.
					</p>
				</header>

				<div class="charts-list__toolbar">
					<UiField label="Search panels" class="charts-list__search">
						<UiInput
							v-model="searchQuery"
							type="search"
							placeholder="Search by name or description..."
							data-testid="panels-search-input"
						/>
					</UiField>

					<UiButton
						v-if="filteredQueries.length > 0"
						:to="`/panels/${connectionId}/new`"
						data-testid="create-panel-button"
						@click="trackCreatePageOpened"
					>
						<template #leading><UiIcon name="add" size="sm" /></template>
						Create panel
					</UiButton>
				</div>

				<PlaceholderTableData v-if="loading" />

				<div v-else-if="filteredQueries.length === 0" class="charts-list__empty">
					<UiIcon name="widgets" size="lg" class="charts-list__empty-icon" />
					<h3 class="charts-list__empty-title">No panels found</h3>
					<p v-if="searchQuery" class="charts-list__empty-text">No panels match your search criteria.</p>
					<p v-else class="charts-list__empty-text">Create your first panel to visualize your data.</p>
					<UiButton :to="`/panels/${connectionId}/new`" @click="trackCreatePageOpened">
						<template #leading><UiIcon name="add" size="sm" /></template>
						Create panel
					</UiButton>
				</div>

				<UiTable
					v-else
					class="charts-list__table"
					:columns="COLUMNS"
					:rows="filteredQueries"
					row-key="id"
					label="Panels"
					interactive
					@row-click="openQuery"
				>
					<template #cell-preview="{ row }">
						<div v-tooltip="getChartTypeName(row.chart_type)" class="charts-list__preview">
							<ChartMiniPreview :chart-type="row.chart_type" />
						</div>
					</template>
					<template #cell-name="{ row }">
						<span class="charts-list__name">{{ row.name }}</span>
					</template>
					<template #cell-description="{ row }">
						<span class="charts-list__muted charts-list__ellipsis">{{ row.description || '—' }}</span>
					</template>
					<template #cell-updated="{ row }">
						<span class="charts-list__muted charts-list__nowrap">{{ formatUpdatedAt(row.updated_at) }}</span>
					</template>
					<template #actions="{ row, index }">
						<UiMenu :label="`${row.name} actions`" align="end">
							<template #trigger="{ triggerProps }">
								<UiIconButton
									v-bind="triggerProps"
									icon="more_vert"
									label="Panel actions"
									:data-testid="`panel-actions-${index}-button`"
								/>
							</template>
							<UiMenuItem
								icon="edit"
								:to="`/panels/${connectionId}/${row.id}`"
								:data-testid="`panel-edit-${index}-menu-item`"
								@select="trackEditPageOpened"
							>
								Edit
							</UiMenuItem>
							<UiDivider />
							<UiMenuItem
								icon="delete"
								variant="danger"
								:data-testid="`panel-delete-${index}-menu-item`"
								@select="openDeleteDialog(row)"
							>
								Delete
							</UiMenuItem>
						</UiMenu>
					</template>
				</UiTable>
			</div>
		</div>
	</div>
</template>

<style scoped>
.charts-list {
	display: flex;
	height: calc(100vh - var(--header-height) - var(--footer-height));
	overflow: hidden;
}

.charts-list__main {
	flex: 1;
	min-width: 0;
	overflow-y: auto;
	background: var(--color-paper);
}

.charts-list__page {
	max-width: 1400px;
	margin: var(--space-12) auto;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
}

.charts-list__header {
	margin-bottom: var(--space-8);
}

.charts-list__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.charts-list__description {
	margin: var(--space-2) 0 0;
	color: var(--color-muted);
}

.charts-list__toolbar {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--space-4);
	margin-bottom: var(--space-6);
}

.charts-list__search {
	flex: 1;
	max-width: 400px;
}

.charts-list__preview {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3rem;
	height: 2.5rem;
}

.charts-list__name {
	font-weight: var(--weight-medium);
}

.charts-list__muted {
	color: var(--color-muted);
}

.charts-list__ellipsis {
	display: block;
	max-width: 300px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.charts-list__nowrap {
	white-space: nowrap;
}

.charts-list__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--space-16) var(--space-6);
	border-radius: var(--radius-panel);
	background: var(--color-paper-2);
	text-align: center;
}

.charts-list__empty-icon {
	margin-bottom: var(--space-4);
	color: var(--color-muted-soft);
}

.charts-list__empty-title {
	margin: 0 0 var(--space-2);
	color: var(--color-ink);
}

.charts-list__empty-text {
	margin: 0 0 var(--space-4);
	color: var(--color-muted);
}

@media (width <= 600px) {
	.charts-list__page {
		margin: var(--space-6) auto;
		padding: 0 var(--space-4);
	}

	.charts-list__toolbar {
		flex-direction: column;
		align-items: stretch;
	}

	.charts-list__search {
		max-width: 100%;
	}
}
</style>
