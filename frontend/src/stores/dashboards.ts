// Port of DashboardsService. The two `httpResource`s (the dashboards list and one dashboard with its
// widgets) become TanStack queries keyed by connection/dashboard id; the CRUD methods are store
// actions. Angular's `dashboardsUpdated` signal only existed so dashboards-list could reload its
// resource, so the mutations invalidate the list query instead.
//
// Failed requests are reported by the client and then throw the notified ApiError (Angular's
// ApiService resolved null); callers reset their busy state in `finally`.
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { defineStore } from 'pinia';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { api } from '@/api/client';
import { resourceQueryDefaults } from '@/api/query-options';
import type {
	CreateDashboardPayload,
	CreateWidgetPayload,
	Dashboard,
	DashboardWidget,
	UpdateDashboardPayload,
	UpdateWidgetPayload,
} from '@/models/dashboard';
import type { GeneratedPanelWithPosition } from '@/models/saved-query';

type MaybeId = MaybeRefOrGetter<string | null | undefined>;

export const dashboardKeys = {
	list: (connectionId: string | null | undefined) => ['dashboards', connectionId ?? null] as const,
	detail: (connectionId: string | null | undefined, dashboardId: string | null | undefined) =>
		['dashboard', connectionId ?? null, dashboardId ?? null] as const,
};

/** Replaces `setActiveConnection` + `dashboards()` / `dashboardsLoading()` / `refreshDashboards()`. */
export function useDashboardsQuery(connectionId: MaybeId) {
	const query = useQuery({
		...resourceQueryDefaults,
		queryKey: computed(() => dashboardKeys.list(toValue(connectionId))),
		enabled: computed(() => !!toValue(connectionId)),
		queryFn: ({ queryKey: [, id] }) =>
			api.get<Dashboard[]>(`/dashboards/${id}`, { errorMessage: 'Failed to fetch dashboards' }),
	});
	return {
		dashboards: computed(() => query.data.value ?? []),
		// httpResource's isLoading was also true while reloading.
		loading: computed(() => query.isFetching.value),
		error: computed(() => query.error.value),
		refresh: () => query.refetch(),
		query,
	};
}

/** Replaces `setActiveDashboard` + `dashboard()` / `dashboardLoading()` / `refreshDashboard()`. */
export function useDashboardQuery(connectionId: MaybeId, dashboardId: MaybeId) {
	const query = useQuery({
		...resourceQueryDefaults,
		queryKey: computed(() => dashboardKeys.detail(toValue(connectionId), toValue(dashboardId))),
		enabled: computed(() => !!toValue(connectionId) && !!toValue(dashboardId)),
		queryFn: ({ queryKey: [, connId, dashId] }) =>
			api.get<Dashboard>(`/dashboard/${dashId}/${connId}`, { errorMessage: 'Failed to fetch dashboard' }),
	});
	return {
		dashboard: computed(() => query.data.value ?? null),
		loading: computed(() => query.isFetching.value),
		error: computed(() => query.error.value),
		refresh: () => query.refetch(),
		query,
	};
}

export const useDashboardsStore = defineStore('dashboards', () => {
	// Store setup runs inside the app's injection context (pinia uses app.runWithContext).
	const queryClient = useQueryClient();

	async function createDashboard(connectionId: string, payload: CreateDashboardPayload): Promise<Dashboard> {
		const dashboard = await api.post<Dashboard>(`/dashboards/${connectionId}`, payload, {
			successMessage: 'Dashboard created successfully',
		});
		if (dashboard) invalidateList(connectionId);
		return dashboard;
	}

	async function updateDashboard(
		connectionId: string,
		dashboardId: string,
		payload: UpdateDashboardPayload,
	): Promise<Dashboard> {
		const dashboard = await api.put<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`, payload, {
			successMessage: 'Dashboard updated successfully',
		});
		if (dashboard) invalidateList(connectionId);
		return dashboard;
	}

	async function deleteDashboard(connectionId: string, dashboardId: string): Promise<Dashboard> {
		const dashboard = await api.delete<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`, {
			successMessage: 'Dashboard deleted successfully',
		});
		if (dashboard) invalidateList(connectionId);
		return dashboard;
	}

	async function createWidget(
		connectionId: string,
		dashboardId: string,
		payload: CreateWidgetPayload,
	): Promise<DashboardWidget> {
		const widget = await api.post<DashboardWidget>(`/dashboard/${dashboardId}/widget/${connectionId}`, payload, {
			successMessage: 'Widget created successfully',
		});
		if (widget) invalidateList(connectionId);
		return widget;
	}

	function updateWidget(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: UpdateWidgetPayload,
	): Promise<DashboardWidget> {
		return api.put<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, payload);
	}

	function updateWidgetPosition(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: Pick<UpdateWidgetPayload, 'position_x' | 'position_y' | 'width' | 'height'>,
	): Promise<DashboardWidget> {
		return updateWidget(connectionId, dashboardId, widgetId, payload);
	}

	function generateWidgetWithAi(
		connectionId: string,
		payload: { chart_description: string; name?: string },
	): Promise<GeneratedPanelWithPosition> {
		return api.post<GeneratedPanelWithPosition>(`/widget/generate/${connectionId}`, payload);
	}

	async function deleteWidget(connectionId: string, dashboardId: string, widgetId: string): Promise<DashboardWidget> {
		const widget = await api.delete<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, {
			successMessage: 'Widget deleted successfully',
		});
		if (widget) invalidateList(connectionId);
		return widget;
	}

	// Where Angular set `dashboardsUpdated`, which made dashboards-list reload its resource.
	function invalidateList(connectionId: string): void {
		queryClient.invalidateQueries({ queryKey: dashboardKeys.list(connectionId) });
	}

	return {
		createDashboard,
		updateDashboard,
		deleteDashboard,
		createWidget,
		updateWidget,
		updateWidgetPosition,
		generateWidgetWithAi,
		deleteWidget,
	};
});
