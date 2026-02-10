import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, ResourceRef, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
	CreateDashboardPayload,
	CreateWidgetPayload,
	Dashboard,
	DashboardWidget,
	UpdateDashboardPayload,
	UpdateWidgetPayload,
} from '../models/dashboard';
import { NotificationsService } from './notifications.service';

export type DashboardUpdateEvent = 'created' | 'updated' | 'deleted' | '';

@Injectable({
	providedIn: 'root',
})
export class DashboardsService {
	private _http = inject(HttpClient);
	private _notifications = inject(NotificationsService);

	private _dashboardsUpdated = signal<DashboardUpdateEvent>('');
	public readonly dashboardsUpdated = this._dashboardsUpdated.asReadonly();

	// Active connection for reactive fetching of dashboards list
	private _activeConnectionId = signal<string | null>(null);

	// Active dashboard for reactive fetching of single dashboard
	private _activeDashboardId = signal<string | null>(null);

	// Resource for dashboards list (using pure signal-based resource with HttpClient)
	private _dashboardsResource: ResourceRef<Dashboard[]> = resource({
		params: () => this._activeConnectionId(),
		loader: async ({ params: connectionId }) => {
			if (!connectionId) return [];
			try {
				return await firstValueFrom(this._http.get<Dashboard[]>(`/dashboards/${connectionId}`));
			} catch (err) {
				console.log(err);
				const error = err as { error?: { message?: string } };
				this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to fetch dashboards');
				return [];
			}
		},
	});

	// Resource for single dashboard with widgets
	private _dashboardResource: ResourceRef<Dashboard | null> = resource({
		params: () => ({ connectionId: this._activeConnectionId(), dashboardId: this._activeDashboardId() }),
		loader: async ({ params }) => {
			if (!params.connectionId || !params.dashboardId) return null;
			try {
				return await firstValueFrom(
					this._http.get<Dashboard>(`/dashboard/${params.dashboardId}/${params.connectionId}`),
				);
			} catch (err) {
				console.log(err);
				const error = err as { error?: { message?: string } };
				this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to fetch dashboard');
				return null;
			}
		},
	});

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

	// Dashboard CRUD operations (Promise-based)
	async createDashboard(connectionId: string, payload: CreateDashboardPayload): Promise<Dashboard | null> {
		try {
			const dashboard = await firstValueFrom(this._http.post<Dashboard>(`/dashboards/${connectionId}`, payload));
			this._notifications.showSuccessSnackbar('Dashboard created successfully');
			this._dashboardsUpdated.set('created');
			return dashboard;
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			console.log(err);
			this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to create dashboard');
			return null;
		}
	}

	async updateDashboard(
		connectionId: string,
		dashboardId: string,
		payload: UpdateDashboardPayload,
	): Promise<Dashboard | null> {
		try {
			const dashboard = await firstValueFrom(
				this._http.put<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`, payload),
			);
			this._notifications.showSuccessSnackbar('Dashboard updated successfully');
			this._dashboardsUpdated.set('updated');
			return dashboard;
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			console.log(err);
			this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to update dashboard');
			return null;
		}
	}

	async deleteDashboard(connectionId: string, dashboardId: string): Promise<Dashboard | null> {
		try {
			const dashboard = await firstValueFrom(this._http.delete<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`));
			this._notifications.showSuccessSnackbar('Dashboard deleted successfully');
			this._dashboardsUpdated.set('deleted');
			return dashboard;
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			console.log(err);
			this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to delete dashboard');
			return null;
		}
	}

	// Widget CRUD operations (Promise-based)
	async createWidget(
		connectionId: string,
		dashboardId: string,
		payload: CreateWidgetPayload,
	): Promise<DashboardWidget | null> {
		try {
			const widget = await firstValueFrom(
				this._http.post<DashboardWidget>(`/dashboard/${dashboardId}/widget/${connectionId}`, payload),
			);
			this._notifications.showSuccessSnackbar('Widget created successfully');
			this._dashboardsUpdated.set('updated');
			return widget;
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			console.log(err);
			this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to create widget');
			return null;
		}
	}

	async updateWidget(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: UpdateWidgetPayload,
	): Promise<DashboardWidget | null> {
		try {
			const widget = await firstValueFrom(
				this._http.put<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, payload),
			);
			return widget;
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			console.log(err);
			this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to update widget');
			return null;
		}
	}

	async updateWidgetPosition(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: Pick<UpdateWidgetPayload, 'position_x' | 'position_y' | 'width' | 'height'>,
	): Promise<DashboardWidget | null> {
		try {
			const widget = await firstValueFrom(
				this._http.put<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, payload),
			);
			return widget;
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			console.log(err);
			this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to update widget position');
			return null;
		}
	}

	async deleteWidget(connectionId: string, dashboardId: string, widgetId: string): Promise<DashboardWidget | null> {
		try {
			const widget = await firstValueFrom(
				this._http.delete<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`),
			);
			this._notifications.showSuccessSnackbar('Widget deleted successfully');
			this._dashboardsUpdated.set('updated');
			return widget;
		} catch (err: unknown) {
			const error = err as { error?: { message?: string } };
			console.log(err);
			this._notifications.showErrorSnackbar(error?.error?.message || 'Failed to delete widget');
			return null;
		}
	}
}
