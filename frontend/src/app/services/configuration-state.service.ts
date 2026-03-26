import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ApiService } from './api.service';
import { NotificationsService } from './notifications.service';

@Injectable({ providedIn: 'root' })
export class ConfigurationStateService {
	private _api = inject(ApiService);
	private _notifications = inject(NotificationsService);
	private _configuring = new BehaviorSubject<Set<string>>(new Set());

	/** Start configuring — fires the API and manages state. Returns a promise that resolves when setup completes. */
	startConfiguring(connectionId: string): Promise<boolean> {
		if (this._configuring.value.has(connectionId)) return Promise.resolve(false);

		const current = this._configuring.value;
		current.add(connectionId);
		this._configuring.next(current);

		return this._runSetup(connectionId);
	}

	/** Check if a connection is currently being configured */
	isConfiguring(connectionId: string): boolean {
		return this._configuring.value.has(connectionId);
	}

	private async _runSetup(connectionId: string): Promise<boolean> {
		try {
			await this._api.get<string>(`/ai/v2/setup/${connectionId}`, { responseType: 'text' });
			this._notifications.showSuccessSnackbar('All tables have been configured.');
			return true;
		} catch {
			this._notifications.showSuccessSnackbar('Configuration could not be completed.');
			return false;
		} finally {
			const current = this._configuring.value;
			current.delete(connectionId);
			this._configuring.next(current);
		}
	}
}
