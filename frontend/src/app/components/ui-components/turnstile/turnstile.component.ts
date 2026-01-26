import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-turnstile',
	templateUrl: './turnstile.component.html',
	styleUrls: ['./turnstile.component.css'],
	imports: [CommonModule],
})
export class TurnstileComponent implements OnInit, OnDestroy {
	@ViewChild('turnstileContainer', { static: true }) turnstileContainer: ElementRef<HTMLDivElement>;

	@Input() siteKey: string = (environment as any).turnstileSiteKey;
	@Input() theme: 'light' | 'dark' | 'auto' = 'auto';

	@Output() tokenReceived = new EventEmitter<string>();
	@Output() tokenError = new EventEmitter<void>();
	@Output() tokenExpired = new EventEmitter<void>();

	private widgetId: string | null = null;
	private pollInterval: ReturnType<typeof setInterval> | null = null;
	private readonly MAX_POLL_ATTEMPTS = 50;
	private readonly POLL_INTERVAL_MS = 100;

	ngOnInit(): void {
		this._waitForTurnstileAndRender();
	}

	ngOnDestroy(): void {
		this._clearPollInterval();
		this._removeWidget();
	}

	public reset(): void {
		if (window.turnstile && this.widgetId) {
			window.turnstile.reset(this.widgetId);
		}
	}

	private _waitForTurnstileAndRender(): void {
		let attempts = 0;

		this.pollInterval = setInterval(() => {
			attempts++;

			if (window.turnstile) {
				this._clearPollInterval();
				this._renderWidget();
				return;
			}

			if (attempts >= this.MAX_POLL_ATTEMPTS) {
				this._clearPollInterval();
				console.error('Turnstile script failed to load');
				this.tokenError.emit();
			}
		}, this.POLL_INTERVAL_MS);
	}

	private _renderWidget(): void {
		if (!window.turnstile || !this.turnstileContainer?.nativeElement) {
			return;
		}

		this.widgetId = window.turnstile.render(this.turnstileContainer.nativeElement, {
			sitekey: this.siteKey,
			callback: (token: string) => {
				this.tokenReceived.emit(token);
			},
			'error-callback': () => {
				this.tokenError.emit();
			},
			'expired-callback': () => {
				this.tokenExpired.emit();
			},
			theme: this.theme,
			appearance: 'always',
		});
	}

	private _removeWidget(): void {
		if (window.turnstile && this.widgetId) {
			window.turnstile.remove(this.widgetId);
			this.widgetId = null;
		}
	}

	private _clearPollInterval(): void {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	}
}
