import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SelfhostedService } from '../services/selfhosted.service';

/**
 * Guard that protects the /setup route.
 * - In SaaS mode, redirects to /login (setup is only for self-hosted)
 * - In self-hosted mode, redirects to /login if already configured
 * - Allows access to /setup only if self-hosted and not configured
 */
export const setupGuard: CanActivateFn = async () => {
	const selfhostedService = inject(SelfhostedService);
	const router = inject(Router);

	// In SaaS mode, redirect to login (setup is only for self-hosted)
	if (!selfhostedService.isSelfHosted()) {
		return router.createUrlTree(['/login']);
	}

	// If we already know the configuration state, use it
	const currentState = selfhostedService.isConfigured();
	if (currentState !== null) {
		if (currentState) {
			// Already configured, redirect to login
			return router.createUrlTree(['/login']);
		} else {
			// Not configured, allow access to setup
			return true;
		}
	}

	// Check configuration from the server
	const response = await selfhostedService.checkConfiguration();
	if (response.isConfigured) {
		// Already configured, redirect to login
		return router.createUrlTree(['/login']);
	} else {
		// Not configured, allow access to setup
		return true;
	}
};
