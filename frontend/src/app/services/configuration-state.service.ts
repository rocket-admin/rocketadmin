import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';
import { NotificationsService } from './notifications.service';

export interface ConfigProgress {
	type: 'message' | 'complete' | 'error';
	text?: string;
	message?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigurationStateService {
	private _notifications = inject(NotificationsService);
	private _configuring = new BehaviorSubject<Set<string>>(new Set());

	/** Latest progress event from the streaming setup endpoint (null when idle). */
	public progress$ = new BehaviorSubject<ConfigProgress | null>(null);

	private _queue: ConfigProgress[] = [];
	private _drainTimer: ReturnType<typeof setInterval> | null = null;
	private _currentDrainIntervalMs = 400;
	private readonly _drainIntervalMsNormal = 400;
	private readonly _drainIntervalMsFast = 80;
	private readonly _drainCapAfterCompleteMs = 1500;

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
		this._queue = [];
		this._stopDrain();
		this._currentDrainIntervalMs = this._drainIntervalMsNormal;
		this._enqueue({ type: 'message', text: 'Starting configuration…' });
		try {
			const url = `${environment.apiRoot || '/api'}/ai/v2/setup/${connectionId}`;
			// Bypassing HttpClient (we need ReadableStream for SSE), so we replicate the masterpwd header that TokenInterceptor would normally inject.
			const masterpwd = localStorage.getItem(`${connectionId}__masterKey`) || '';
			const response = await fetch(url, {
				method: 'GET',
				credentials: 'include',
				headers: { masterpwd },
			});

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
						if (tail) this._parseAndEnqueue(tail);
						break;
					}
					buffer += decoder.decode(value, { stream: true });
					let newlineIdx: number;
					while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
						const line = buffer.slice(0, newlineIdx).trim();
						buffer = buffer.slice(newlineIdx + 1);
						if (!line) continue;
						this._parseAndEnqueue(line);
					}
				}
			}

			await this._waitForDrain();
			this._notifications.showSuccessSnackbar('All tables have been configured.');
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Configuration could not be completed.';
			this._queue = [];
			this._stopDrain();
			this.progress$.next({ type: 'error', message });
			this._notifications.showErrorSnackbar(message);
			return false;
		} finally {
			const current = this._configuring.value;
			current.delete(connectionId);
			this._configuring.next(current);
		}
	}

	private _parseAndEnqueue(line: string): void {
		// Support SSE-style `data: {...}` lines as well as raw JSON lines.
		const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
		if (!payload || payload === '[DONE]') return;
		try {
			const parsed = JSON.parse(payload) as ConfigProgress;
			// `complete` keeps order with the trailing messages but speeds up drain
			// so the remaining log flushes quickly instead of pacing at the normal rate.
			if (parsed.type === 'complete') {
				this._enqueue({ type: 'message', text: '✓ Setup complete' });
				this._enqueue(parsed);
				this._switchDrainSpeed(this._drainIntervalMsFast);
				return;
			}
			this._enqueue(parsed);
		} catch {
			// Ignore non-JSON keepalive/comment frames.
		}
	}

	private _enqueue(p: ConfigProgress): void {
		this._queue.push(p);
		this._startDrain();
	}

	private _startDrain(): void {
		if (this._drainTimer) return;
		// Emit first item immediately, then pace the rest.
		this._drainOne();
		this._drainTimer = setInterval(() => this._drainOne(), this._currentDrainIntervalMs);
	}

	private _switchDrainSpeed(intervalMs: number): void {
		this._currentDrainIntervalMs = intervalMs;
		if (this._drainTimer) {
			clearInterval(this._drainTimer);
			this._drainTimer = setInterval(() => this._drainOne(), intervalMs);
		}
	}

	private _drainOne(): void {
		const next = this._queue.shift();
		if (!next) {
			this._stopDrain();
			return;
		}
		this.progress$.next(next);
	}

	private _stopDrain(): void {
		if (this._drainTimer) {
			clearInterval(this._drainTimer);
			this._drainTimer = null;
		}
	}

	private _waitForDrain(): Promise<void> {
		// Switch to fast drain on stream end so we don't add long display tail.
		this._switchDrainSpeed(this._drainIntervalMsFast);
		const start = Date.now();
		return new Promise((resolve) => {
			const check = (): void => {
				if (this._queue.length === 0 && !this._drainTimer) {
					resolve();
					return;
				}
				if (Date.now() - start >= this._drainCapAfterCompleteMs) {
					// Cap reached — flush whatever is left so we don't delay navigation further.
					while (this._queue.length > 0) this._drainOne();
					this._stopDrain();
					resolve();
					return;
				}
				setTimeout(check, this._drainIntervalMsFast);
			};
			check();
		});
	}
}
