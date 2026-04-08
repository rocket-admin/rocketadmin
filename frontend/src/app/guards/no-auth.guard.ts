import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { differenceInMilliseconds } from 'date-fns';

/**
 * Guard that prevents logged-in users from accessing auth pages (login, registration).
 * Redirects authenticated users to /connections-list.
 */
export const noAuthGuard: CanActivateFn = () => {
	const router = inject(Router);

	try {
		const expirationToken = localStorage.getItem('token_expiration');
		if (expirationToken) {
			const expirationTime = new Date(expirationToken);
			const expirationInterval = differenceInMilliseconds(expirationTime, new Date());
			if (expirationInterval > 0) {
				return router.createUrlTree(['/connections-list']);
			}
		}
	} catch {
		// If anything fails, allow access to auth pages
	}

	return true;
};
