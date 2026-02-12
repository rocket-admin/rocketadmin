import { DestroyRef, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import posthog from 'posthog-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PosthogService {
	constructor(
		private ngZone: NgZone,
		private router: Router,
		private destroyRef: DestroyRef,
	) {
		if ((environment as any).saas && environment.production) {
			this.initPostHog();
		}
	}

	private initPostHog() {
		this.ngZone.runOutsideAngular(() => {
			posthog.init('phc_VPnWHIMj9UjhRLPr7shATjgL0J4KrWWOHkK3JwZbnkw', {
				api_host: 'https://us.i.posthog.com',
				defaults: '2025-11-30',
			});
		});
	}
}
