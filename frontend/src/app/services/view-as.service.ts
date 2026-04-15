import { Location } from '@angular/common';
import { computed, Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const VIEW_AS_PARAM = 'viewAs';

@Injectable({ providedIn: 'root' })
export class ViewAsService {
	private _router = inject(Router);
	private _location = inject(Location);

	private _viewAsGroupId = signal<string | null>(null);

	public readonly viewAsGroupId = this._viewAsGroupId.asReadonly();
	public readonly isActive = computed(() => !!this._viewAsGroupId());

	constructor() {
		// Initial read on construction (handles deep links / new tabs)
		const initial = this._readFromCurrentUrl();
		if (initial) this._viewAsGroupId.set(initial);

		// Keep signal and URL in sync after every navigation
		this._router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
			const fromUrl = this._readFromCurrentUrl();
			const fromSignal = this._viewAsGroupId();

			if (fromUrl) {
				if (fromUrl !== fromSignal) this._viewAsGroupId.set(fromUrl);
				return;
			}

			if (fromSignal) {
				// URL was navigated without viewAs but we want to persist it.
				// Inject the param back into the URL silently (no new navigation).
				this._location.replaceState(this._appendParam(this._router.url, VIEW_AS_PARAM, fromSignal));
			}
		});
	}

	clearViewAs(): void {
		this._viewAsGroupId.set(null);
		this._router.navigate([], {
			queryParams: { [VIEW_AS_PARAM]: null },
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	private _readFromCurrentUrl(): string | null {
		return this._router.routerState.snapshot.root.queryParamMap.get(VIEW_AS_PARAM);
	}

	private _appendParam(url: string, key: string, value: string): string {
		const [path, query = ''] = url.split('?');
		const params = new URLSearchParams(query);
		params.set(key, value);
		return `${path}?${params.toString()}`;
	}
}
