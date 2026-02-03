import { computed, Injectable, inject, signal } from '@angular/core';
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
	private _notifications = inject(NotificationsService);

	private _isConfigured = signal<boolean | null>(null);
	private _isCheckingConfiguration = signal<boolean>(false);

	public readonly isConfigured = this._isConfigured.asReadonly();
	public readonly isCheckingConfiguration = this._isCheckingConfiguration.asReadonly();
	public readonly isSelfHosted = computed(() => !(environment as any).saas);

	async checkConfiguration(): Promise<IsConfiguredResponse> {
		this._isCheckingConfiguration.set(true);
		try {
			const response = await fetch('/api/selfhosted/is-configured');
			if (!response.ok) {
				throw new Error(`HTTP error: ${response.status}`);
			}
			const data: IsConfiguredResponse = await response.json();
			this._isConfigured.set(data.isConfigured);
			this._isCheckingConfiguration.set(false);
			return data;
		} catch (err) {
			console.error('Failed to check configuration:', err);
			this._isCheckingConfiguration.set(false);
			// If the endpoint fails, assume configured to avoid blocking login
			this._isConfigured.set(true);
			return { isConfigured: true };
		}
	}

	async createInitialUser(userData: CreateInitialUserRequest): Promise<CreateInitialUserResponse> {
		try {
			const response = await fetch('/api/selfhosted/initial-user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(userData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw { error: errorData, message: `HTTP error: ${response.status}` };
			}

			const data: CreateInitialUserResponse = await response.json();
			this._notifications.showSuccessSnackbar('Admin account created successfully.');
			this._isConfigured.set(true);
			return data;
		} catch (err: any) {
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
			throw err;
		}
	}

	resetConfigurationState(): void {
		this._isConfigured.set(null);
	}
}
