<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/dashboards-list: the dashboards of a connection,
// at /dashboards/:connectionId, as searchable cards with create / edit / delete dialogs.
import { computed, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { trackDashboardsEvent } from '@/components/dashboards/analytics';
import ChartMiniPreview from '@/components/dashboards/ChartMiniPreview.vue';
import DashboardDeleteDialog from '@/components/dashboards/DashboardDeleteDialog.vue';
import DashboardEditDialog from '@/components/dashboards/DashboardEditDialog.vue';
import DashboardsSidebar from '@/components/dashboards/DashboardsSidebar.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import PlaceholderDashboards from '@/components/skeletons/PlaceholderDashboards.vue';
import {
	UiButton,
	UiCard,
	UiDivider,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiMenu,
	UiMenuItem,
} from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import type { Dashboard } from '@/models/dashboard';
import { useConnectionsStore } from '@/stores/connections';
import { useDashboardsQuery } from '@/stores/dashboards';

const route = useRoute();
const dialog = useDialog();
const connections = useConnectionsStore();

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const { dashboards, loading } = useDashboardsQuery(connectionId);
const searchQuery = ref('');

const filteredDashboards = computed(() => {
	const search = searchQuery.value;
	if (!search) return dashboards.value;
	const query = search.toLowerCase();
	return dashboards.value.filter(
		(d) => d.name.toLowerCase().includes(query) || d.description?.toLowerCase().includes(query),
	);
});

watchEffect(() => {
	document.title = `Dashboards | ${connections.connectionTitle || 'Rocketadmin'}`;
});

function dashboardPath(dashboard: Dashboard): string {
	return `/dashboards/${connectionId.value}/${dashboard.id}`;
}

function formatDate(date: string): string {
	return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function trackViewDashboardOpened(): void {
	trackDashboardsEvent('Dashboards: view dashboard opened');
}

function openCreateDialog(): void {
	dialog.open(DashboardEditDialog, { data: { connectionId: connectionId.value, dashboard: null } });
	trackDashboardsEvent('Dashboards: create dashboard dialog opened');
}

function openEditDialog(dashboard: Dashboard): void {
	dialog.open(DashboardEditDialog, { data: { connectionId: connectionId.value, dashboard } });
	trackDashboardsEvent('Dashboards: edit dashboard dialog opened');
}

function openDeleteDialog(dashboard: Dashboard): void {
	dialog.open(DashboardDeleteDialog, { data: { dashboard, connectionId: connectionId.value } });
	trackDashboardsEvent('Dashboards: delete dashboard dialog opened');
}
</script>

<template>
	<div class="dashboards-list">
		<DashboardsSidebar :connection-id="connectionId" active-tab="dashboards" />

		<div class="dashboards-list__main">
			<AppAlert />

			<div class="dashboards-list__page">
				<header class="dashboards-list__header">
					<h1 class="dashboards-list__title">Dashboards</h1>
					<p class="dashboards-list__description">
						Create and manage custom dashboards with charts, tables, and metrics.
					</p>
				</header>

				<div class="dashboards-list__toolbar">
					<UiField label="Search dashboards" class="dashboards-list__search">
						<UiInput
							v-model="searchQuery"
							type="search"
							placeholder="Search by name or description..."
							data-testid="dashboards-search-input"
						/>
					</UiField>

					<UiButton v-if="filteredDashboards.length > 0" data-testid="create-dashboard-button" @click="openCreateDialog">
						<template #leading><UiIcon name="add" size="sm" /></template>
						Create dashboard
					</UiButton>
				</div>

				<PlaceholderDashboards v-if="loading" />

				<div v-else-if="filteredDashboards.length === 0" class="dashboards-list__empty">
					<svg class="dashboards-list__illustration" viewBox="0 0 120 100" fill="none" aria-hidden="true">
						<!-- Back card -->
						<rect class="illust__card illust__card--back" x="30" y="8" width="60" height="44" rx="6" />
						<rect class="illust__detail" x="38" y="16" width="20" height="3" rx="1.5" />
						<rect class="illust__detail" x="38" y="23" width="36" height="2" rx="1" />
						<rect class="illust__detail" x="38" y="28" width="28" height="2" rx="1" />
						<!-- Middle card -->
						<rect class="illust__card illust__card--mid" x="20" y="22" width="60" height="44" rx="6" />
						<rect class="illust__detail" x="28" y="30" width="18" height="3" rx="1.5" />
						<rect class="illust__detail" x="28" y="37" width="32" height="2" rx="1" />
						<rect class="illust__detail" x="28" y="42" width="24" height="2" rx="1" />
						<!-- Front card -->
						<rect class="illust__card illust__card--front" x="10" y="38" width="60" height="52" rx="7" />
						<rect class="illust__detail illust__detail--accent" x="18" y="46" width="22" height="3" rx="1.5" />
						<rect class="illust__detail" x="18" y="53" width="16" height="2" rx="1" />
						<!-- Mini line chart -->
						<path class="illust__line" d="M18,78 L28,72 L38,75 L48,65 L58,68" />
						<path class="illust__area" d="M18,78 L28,72 L38,75 L48,65 L58,68 L58,82 L18,82 Z" />
						<circle class="illust__dot" cx="48" cy="65" r="2.5" />
						<circle class="illust__dot" cx="58" cy="68" r="2.5" />
					</svg>
					<h3 class="dashboards-list__empty-title">No dashboards yet</h3>
					<p v-if="searchQuery" class="dashboards-list__empty-text">No dashboards match your search criteria.</p>
					<p v-else class="dashboards-list__empty-text">
						Dashboards help you visualize your data with charts, tables, and metrics — all in one place.
					</p>
					<UiButton data-testid="create-dashboard-button" @click="openCreateDialog">
						<template #leading><UiIcon name="add" size="sm" /></template>
						Create dashboard
					</UiButton>
				</div>

				<ul v-else class="dashboards-list__grid">
					<UiCard
						v-for="(dashboard, i) in filteredDashboards"
						:key="dashboard.id"
						as="li"
						padding="none"
						class="dashboard-card"
						:data-testid="`dashboard-card-${i}`"
					>
						<RouterLink
							:to="dashboardPath(dashboard)"
							class="dashboard-card__preview"
							tabindex="-1"
							aria-hidden="true"
							@click="trackViewDashboardOpened"
						>
							<div v-if="!dashboard.widgets?.length" class="dashboard-card__placeholder">
								<UiIcon name="dashboard" size="lg" class="dashboard-card__placeholder-icon" />
								<span class="dashboard-card__placeholder-hint">Connect your first panel</span>
							</div>
							<ChartMiniPreview v-else chart-type="line" />
						</RouterLink>

						<div class="dashboard-card__content">
							<div class="dashboard-card__header">
								<RouterLink
									:to="dashboardPath(dashboard)"
									class="dashboard-card__name"
									@click="trackViewDashboardOpened"
								>
									{{ dashboard.name }}
								</RouterLink>
								<UiMenu :label="`${dashboard.name} actions`" align="end">
									<template #trigger="{ triggerProps }">
										<UiIconButton
											v-bind="triggerProps"
											icon="more_vert"
											label="Dashboard actions"
											size="sm"
											:data-testid="`dashboard-actions-${i}-button`"
										/>
									</template>
									<UiMenuItem
										icon="visibility"
										:to="dashboardPath(dashboard)"
										:data-testid="`dashboard-view-${i}-menu-item`"
										@select="trackViewDashboardOpened"
									>
										View
									</UiMenuItem>
									<UiMenuItem
										icon="edit"
										:data-testid="`dashboard-edit-${i}-menu-item`"
										@select="openEditDialog(dashboard)"
									>
										Edit
									</UiMenuItem>
									<UiDivider />
									<UiMenuItem
										icon="delete"
										variant="danger"
										:data-testid="`dashboard-delete-${i}-menu-item`"
										@select="openDeleteDialog(dashboard)"
									>
										Delete
									</UiMenuItem>
								</UiMenu>
							</div>
							<p v-if="dashboard.description" class="dashboard-card__description">{{ dashboard.description }}</p>
							<div class="dashboard-card__meta">
								<span class="dashboard-card__count">
									<UiIcon name="widgets" size="sm" />
									{{ dashboard.widgets?.length || 0 }} panels
								</span>
								<span>{{ formatDate(dashboard.updated_at) }}</span>
							</div>
						</div>
					</UiCard>
				</ul>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboards-list {
	display: flex;
	height: calc(100vh - var(--header-height) - var(--footer-height));
	overflow: hidden;
}

.dashboards-list__main {
	flex: 1;
	min-width: 0;
	overflow-y: auto;
	background: var(--color-paper);
}

.dashboards-list__page {
	max-width: 1400px;
	margin: var(--space-12) auto;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
}

.dashboards-list__header {
	margin-bottom: var(--space-8);
}

.dashboards-list__title {
	margin: 0;
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.dashboards-list__description {
	margin: var(--space-2) 0 0;
	color: var(--color-muted);
}

.dashboards-list__toolbar {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--space-4);
	margin-bottom: var(--space-6);
}

.dashboards-list__search {
	flex: 1;
	max-width: 400px;
}

.dashboards-list__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: var(--space-6);
	margin: 0;
	padding: 0;
	list-style: none;
}

.dashboard-card {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	transition:
		box-shadow var(--motion-base) var(--ease-out),
		transform var(--motion-base) var(--ease-out);
}

.dashboard-card:hover {
	box-shadow: var(--shadow-lift);
	transform: translateY(-2px);
}

.dashboard-card__preview {
	display: block;
	height: 160px;
	overflow: hidden;
	border-bottom: 1px solid var(--color-line);
	background: var(--color-paper-2);
	text-decoration: none;
}

.dashboard-card__placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.dashboard-card__placeholder-icon {
	color: var(--color-muted-soft);
}

.dashboard-card__placeholder-hint {
	margin-top: var(--space-1);
	font-size: var(--text-xs);
	color: var(--color-muted-soft);
}

.dashboard-card__content {
	display: flex;
	flex: 1;
	flex-direction: column;
	padding: var(--space-4);
}

.dashboard-card__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--space-2);
	margin-bottom: var(--space-2);
}

.dashboard-card__name {
	display: -webkit-box;
	flex: 1;
	overflow: hidden;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	font-size: var(--text-md);
	font-weight: var(--weight-medium);
	line-height: var(--leading-snug);
	color: inherit;
	text-decoration: none;
}

.dashboard-card__name:hover {
	color: var(--color-accent);
}

.dashboard-card__description {
	display: -webkit-box;
	margin: 0 0 var(--space-3);
	overflow: hidden;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	font-size: var(--text-sm);
	color: var(--color-muted);
}

.dashboard-card__meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: auto;
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.dashboard-card__count {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.dashboards-list__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--space-16) var(--space-6);
	text-align: center;
}

.dashboards-list__illustration {
	width: 120px;
	height: 100px;
	margin-bottom: var(--space-4);
}

.illust__card {
	stroke: var(--color-line-strong);
	stroke-width: 1.5;
}

.illust__card--back {
	fill: var(--color-paper-2);
}

.illust__card--mid {
	fill: color-mix(in srgb, var(--color-paper-2) 50%, var(--color-surface));
}

.illust__card--front {
	fill: var(--color-surface);
}

.illust__detail {
	fill: var(--color-line-strong);
}

.illust__detail--accent {
	fill: var(--color-muted-soft);
}

.illust__line {
	fill: none;
	stroke: var(--color-accent);
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
	opacity: 0.9;
}

.illust__area {
	fill: color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.illust__dot {
	fill: var(--color-accent);
	opacity: 0.9;
}

.dashboards-list__empty-title {
	margin: 0 0 var(--space-2);
	color: var(--color-ink);
}

.dashboards-list__empty-text {
	margin: 0 0 var(--space-4);
	color: var(--color-muted);
}

@media (width <= 600px) {
	.dashboards-list__page {
		margin: var(--space-6) auto;
		padding: 0 var(--space-4);
	}

	.dashboards-list__toolbar {
		flex-direction: column;
		align-items: stretch;
	}

	.dashboards-list__search {
		max-width: 100%;
	}

	.dashboards-list__grid {
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}
}
</style>
