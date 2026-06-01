import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';
import { NotificationsService } from './notifications.service';

export interface ConfigProgress {
	current?: number;
	total?: number;
	table?: string;
	step?: string;
	message?: string;
	done?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfigurationStateService {
	private _notifications = inject(NotificationsService);
	private _configuring = new BehaviorSubject<Set<string>>(new Set());

	/** Latest progress event from the streaming setup endpoint (null when idle). */
	public progress$ = new BehaviorSubject<ConfigProgress | null>(null);

	/** Start configuring — opens a streaming connection, parses progress events, resolves when complete. */
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
		this.progress$.next({ message: 'Starting configuration…' });
		try {
			const url = `${environment.apiRoot || '/api'}/ai/v2/setup/${connectionId}`;
			const response = await fetch(url, { method: 'GET', credentials: 'include' });

			if (!response.ok) {
				throw new Error(`Setup failed with status ${response.status}`);
			}

			if (response.body) {
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						const tail = buffer.trim();
						if (tail) this._parseAndEmit(tail);
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIdx: number;
					while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
						const line = buffer.slice(0, newlineIdx).trim();
						buffer = buffer.slice(newlineIdx + 1);
						if (!line) continue;
						this._parseAndEmit(line);
					}
				}
			}

			this._notifications.showSuccessSnackbar('All tables have been configured.');
			return true;
		} catch {
			this._notifications.showSuccessSnackbar('Configuration could not be completed.');
			return false;
		} finally {
			const current = this._configuring.value;
			current.delete(connectionId);
			this._configuring.next(current);
			this.progress$.next(null);
		}
	}

	private _parseAndEmit(line: string): void {
		// Support SSE-style `data: {...}` lines as well as raw JSON lines.
		const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
		if (!payload || payload === '[DONE]') return;
		try {
			const parsed = JSON.parse(payload) as ConfigProgress;
			this.progress$.next(parsed);
		} catch {
			// Ignore non-JSON keepalive/comment frames.
		}
	}
}
