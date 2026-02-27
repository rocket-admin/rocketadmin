import { HttpResourceRef } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import {
	CreateDashboardPayload,
	CreateWidgetPayload,
	Dashboard,
	DashboardWidget,
	UpdateDashboardPayload,
	UpdateWidgetPayload,
} from '../models/dashboard';
import { GeneratedPanelWithPosition } from '../models/saved-query';
import { ApiService } from './api.service';

export type DashboardUpdateEvent = 'created' | 'updated' | 'deleted' | '';

@Injectable({
	providedIn: 'root',
})
export class DashboardsService {
	private _api = inject(ApiService);

	private _dashboardsUpdated = signal<DashboardUpdateEvent>('');
	public readonly dashboardsUpdated = this._dashboardsUpdated.asReadonly();

	// Active connection for reactive fetching of dashboards list
	private _activeConnectionId = signal<string | null>(null);

	// Active dashboard for reactive fetching of single dashboard
	private _activeDashboardId = signal<string | null>(null);

	// Resource for dashboards list
	private _dashboardsResource: HttpResourceRef<Dashboard[] | undefined> = this._api.resource<Dashboard[]>(
		() => {
			const connectionId = this._activeConnectionId();
			if (!connectionId) return undefined;
			return `/dashboards/${connectionId}`;
		},
		{ errorMessage: 'Failed to fetch dashboards' },
	);

	// Resource for single dashboard with widgets
	private _dashboardResource: HttpResourceRef<Dashboard | undefined> = this._api.resource<Dashboard>(
		() => {
			const connectionId = this._activeConnectionId();
			const dashboardId = this._activeDashboardId();
			if (!connectionId || !dashboardId) return undefined;
			return `/dashboard/${dashboardId}/${connectionId}`;
		},
		{ errorMessage: 'Failed to fetch dashboard' },
	);

	// Computed signals for convenient access
	public readonly dashboards = computed(() => this._dashboardsResource.value() ?? []);
	public readonly dashboardsLoading = computed(() => this._dashboardsResource.isLoading());
	public readonly dashboardsError = computed(() => this._dashboardsResource.error() as Error | null);

	public readonly dashboard = computed(() => this._dashboardResource.value() ?? null);
	public readonly dashboardLoading = computed(() => this._dashboardResource.isLoading());
	public readonly dashboardError = computed(() => this._dashboardResource.error() as Error | null);

	// Methods to control resource
	setActiveConnection(connectionId: string): void {
		this._activeConnectionId.set(connectionId);
	}

	setActiveDashboard(dashboardId: string | null): void {
		this._activeDashboardId.set(dashboardId);
	}

	refreshDashboards(): void {
		this._dashboardsResource.reload();
	}

	clearDashboardsUpdated(): void {
		this._dashboardsUpdated.set('');
	}

	refreshDashboard(): void {
		this._dashboardResource.reload();
	}

	// Dashboard CRUD operations
	async createDashboard(connectionId: string, payload: CreateDashboardPayload): Promise<Dashboard | null> {
		const dashboard = await this._api.post<Dashboard>(`/dashboards/${connectionId}`, payload, {
			successMessage: 'Dashboard created successfully',
		});
		if (dashboard) this._dashboardsUpdated.set('created');
		return dashboard;
	}

	async updateDashboard(
		connectionId: string,
		dashboardId: string,
		payload: UpdateDashboardPayload,
	): Promise<Dashboard | null> {
		const dashboard = await this._api.put<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`, payload, {
			successMessage: 'Dashboard updated successfully',
		});
		if (dashboard) this._dashboardsUpdated.set('updated');
		return dashboard;
	}

	async deleteDashboard(connectionId: string, dashboardId: string): Promise<Dashboard | null> {
		const dashboard = await this._api.delete<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`, {
			successMessage: 'Dashboard deleted successfully',
		});
		if (dashboard) this._dashboardsUpdated.set('deleted');
		return dashboard;
	}

	// Widget CRUD operations
	async createWidget(
		connectionId: string,
		dashboardId: string,
		payload: CreateWidgetPayload,
	): Promise<DashboardWidget | null> {
		const widget = await this._api.post<DashboardWidget>(`/dashboard/${dashboardId}/widget/${connectionId}`, payload, {
			successMessage: 'Widget created successfully',
		});
		if (widget) this._dashboardsUpdated.set('updated');
		return widget;
	}

	async updateWidget(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: UpdateWidgetPayload,
	): Promise<DashboardWidget | null> {
		return this._api.put<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, payload);
	}

	async updateWidgetPosition(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: Pick<UpdateWidgetPayload, 'position_x' | 'position_y' | 'width' | 'height'>,
	): Promise<DashboardWidget | null> {
		return this._api.put<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, payload);
	}

	async generateWidgetWithAi(
		dashboardId: string,
		connectionId: string,
		payload: { chart_description: string; name?: string },
	): Promise<GeneratedPanelWithPosition | null> {
		return this._api.post<GeneratedPanelWithPosition>(
			`/dashboard/${dashboardId}/widget/generate/${connectionId}`,
			payload,
		);
	}

	async deleteWidget(connectionId: string, dashboardId: string, widgetId: string): Promise<DashboardWidget | null> {
		const widget = await this._api.delete<DashboardWidget>(
			`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`,
			{
				successMessage: 'Widget deleted successfully',
			},
		);
		if (widget) this._dashboardsUpdated.set('updated');
		return widget;
	}
}
