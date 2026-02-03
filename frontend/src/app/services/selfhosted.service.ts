import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { catchError, EMPTY, map, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AlertActionType, AlertType } from '../models/alert';
import { NotificationsService } from './notifications.service';

export interface IsConfiguredResponse {
	isConfigured: boolean;
}

export interface CreateInitialUserRequest {
	email: string;
	password: string;
}

export interface CreateInitialUserResponse {
	success: boolean;
}

@Injectable({
	providedIn: 'root',
})
export class SelfhostedService {
	private _http = inject(HttpClient);
	private _notifications = inject(NotificationsService);

	private _isConfigured = signal<boolean | null>(null);
	private _isCheckingConfiguration = signal<boolean>(false);

	public readonly isConfigured = this._isConfigured.asReadonly();
	public readonly isCheckingConfiguration = this._isCheckingConfiguration.asReadonly();
	public readonly isSelfHosted = computed(() => !(environment as any).saas);

	checkConfiguration(): Observable<IsConfiguredResponse> {
		this._isCheckingConfiguration.set(true);
		return this._http.get<IsConfiguredResponse>('/selfhosted/is-configured').pipe(
			tap((response) => {
				this._isConfigured.set(response.isConfigured);
				this._isCheckingConfiguration.set(false);
			}),
			catchError((err) => {
				console.error('Failed to check configuration:', err);
				this._isCheckingConfiguration.set(false);
				// If the endpoint fails, assume configured to avoid blocking login
				this._isConfigured.set(true);
				return EMPTY;
			}),
		);
	}

	createInitialUser(userData: CreateInitialUserRequest): Observable<CreateInitialUserResponse> {
		return this._http.post<CreateInitialUserResponse>('/selfhosted/initial-user', userData).pipe(
			map((res) => {
				this._notifications.showSuccessSnackbar('Admin account created successfully.');
				this._isConfigured.set(true);
				return res;
			}),
			catchError((err) => {
				console.error('Failed to create initial user:', err);
				this._notifications.showAlert(
					AlertType.Error,
					{ abstract: err.error?.message || err.message, details: err.error?.originalMessage },
					[
						{
							type: AlertActionType.Button,
							caption: 'Dismiss',
							action: () => this._notifications.dismissAlert(),
						},
					],
				);
				return EMPTY;
			}),
		);
	}

	resetConfigurationState(): void {
		this._isConfigured.set(null);
	}
}
