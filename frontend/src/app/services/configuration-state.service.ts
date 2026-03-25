import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ApiService } from './api.service';
import { NotificationsService } from './notifications.service';

@Injectable({ providedIn: 'root' })
export class ConfigurationStateService {
	private _api = inject(ApiService);
	private _notifications = inject(NotificationsService);
	private _configuring = new BehaviorSubject<Set<string>>(new Set());

	/** Start configuring — fires the API and manages state. Returns immediately. */
	startConfiguring(connectionId: string): void {
		if (this._configuring.value.has(connectionId)) return;

		const current = this._configuring.value;
		current.add(connectionId);
		this._configuring.next(current);

		this._runSetup(connectionId);
	}

	/** Check if a connection is currently being configured */
	isConfiguring(connectionId: string): boolean {
		return this._configuring.value.has(connectionId);
	}

	private async _runSetup(connectionId: string): Promise<void> {
		try {
			await this._api.get<string>(`/ai/v2/setup/${connectionId}`, { responseType: 'text' });
			this._notifications.showSuccessSnackbar('All tables have been configured.');
		} catch {
			this._notifications.showSuccessSnackbar('Configuration could not be completed.');
		} finally {
			const current = this._configuring.value;
			current.delete(connectionId);
			this._configuring.next(current);
		}
	}
}
