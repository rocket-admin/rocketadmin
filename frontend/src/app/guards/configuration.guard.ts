import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SelfhostedService } from '../services/selfhosted.service';

/**
 * Guard that protects the /login route.
 * In self-hosted mode, redirects to /setup if the app is not configured.
 * In SaaS mode, allows access immediately.
 */
export const configurationGuard: CanActivateFn = async () => {
	const selfhostedService = inject(SelfhostedService);
	const router = inject(Router);

	// In SaaS mode, always allow access to login
	if (!selfhostedService.isSelfHosted()) {
		return true;
	}

	// If we already know the configuration state, use it
	const currentState = selfhostedService.isConfigured();
	if (currentState !== null) {
		if (currentState) {
			return true;
		} else {
			return router.createUrlTree(['/setup']);
		}
	}

	// Check configuration from the server
	const response = await selfhostedService.checkConfiguration();
	if (response.isConfigured) {
		return true;
	} else {
		return router.createUrlTree(['/setup']);
	}
};
