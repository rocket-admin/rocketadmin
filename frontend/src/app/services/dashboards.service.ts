import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { EMPTY, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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

	// Resource for dashboards list
	private _dashboardsResource = rxResource({
		params: () => this._activeConnectionId(),
		stream: ({ params: connectionId }) => {
			if (!connectionId) return EMPTY;
			return this._http.get<Dashboard[]>(`/dashboards/${connectionId}`).pipe(
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch dashboards');
					return EMPTY;
				}),
			);
		},
	});

	// Resource for single dashboard with widgets
	private _dashboardResource = rxResource({
		params: () => ({ connectionId: this._activeConnectionId(), dashboardId: this._activeDashboardId() }),
		stream: ({ params }) => {
			if (!params.connectionId || !params.dashboardId) return EMPTY;
			return this._http.get<Dashboard>(`/dashboard/${params.dashboardId}/${params.connectionId}`).pipe(
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch dashboard');
					return EMPTY;
				}),
			);
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

	refreshDashboard(): void {
		this._dashboardResource.reload();
	}

	// Dashboard CRUD operations
	createDashboard(connectionId: string, payload: CreateDashboardPayload): Observable<Dashboard> {
		return this._http.post<Dashboard>(`/dashboards/${connectionId}`, payload).pipe(
			tap(() => {
				this._notifications.showSuccessSnackbar('Dashboard created successfully');
				this._dashboardsUpdated.set('created');
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to create dashboard');
				return EMPTY;
			}),
		);
	}

	updateDashboard(connectionId: string, dashboardId: string, payload: UpdateDashboardPayload): Observable<Dashboard> {
		return this._http.put<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`, payload).pipe(
			tap(() => {
				this._notifications.showSuccessSnackbar('Dashboard updated successfully');
				this._dashboardsUpdated.set('updated');
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to update dashboard');
				return EMPTY;
			}),
		);
	}

	deleteDashboard(connectionId: string, dashboardId: string): Observable<Dashboard> {
		return this._http.delete<Dashboard>(`/dashboard/${dashboardId}/${connectionId}`).pipe(
			tap(() => {
				this._notifications.showSuccessSnackbar('Dashboard deleted successfully');
				this._dashboardsUpdated.set('deleted');
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to delete dashboard');
				return EMPTY;
			}),
		);
	}

	// Widget CRUD operations
	createWidget(connectionId: string, dashboardId: string, payload: CreateWidgetPayload): Observable<DashboardWidget> {
		return this._http.post<DashboardWidget>(`/dashboard/${dashboardId}/widget/${connectionId}`, payload).pipe(
			tap(() => {
				this._notifications.showSuccessSnackbar('Widget created successfully');
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to create widget');
				return EMPTY;
			}),
		);
	}

	updateWidget(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: UpdateWidgetPayload,
	): Observable<DashboardWidget> {
		return this._http
			.put<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, payload)
			.pipe(
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || 'Failed to update widget');
					return EMPTY;
				}),
			);
	}

	updateWidgetPosition(
		connectionId: string,
		dashboardId: string,
		widgetId: string,
		payload: Pick<UpdateWidgetPayload, 'position_x' | 'position_y' | 'width' | 'height'>,
	): Observable<DashboardWidget> {
		return this._http
			.put<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`, payload)
			.pipe(
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || 'Failed to update widget position');
					return EMPTY;
				}),
			);
	}

	deleteWidget(connectionId: string, dashboardId: string, widgetId: string): Observable<DashboardWidget> {
		return this._http.delete<DashboardWidget>(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`).pipe(
			tap(() => {
				this._notifications.showSuccessSnackbar('Widget deleted successfully');
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to delete widget');
				return EMPTY;
			}),
		);
	}
}
