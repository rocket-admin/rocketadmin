import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { differenceInMilliseconds } from 'date-fns';

@Injectable({
	providedIn: 'root',
})
export class AuthGuard implements CanActivate {
	constructor(private router: Router) {}

	async canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) {
		try {
			const expirationToken = localStorage.getItem('token_expiration');
			let expirationTime = null;
			if (expirationToken) expirationTime = new Date(expirationToken);
			const currantTime = new Date();

			if (expirationTime && currantTime) {
				const expirationInterval = differenceInMilliseconds(expirationTime, currantTime);
				if (expirationInterval > 0) return true;
			} else {
				console.log('auth guard, expirationInterval <= 0');
				this.router.navigate(['/login']);
			}
			return false;
		} catch {
			return false;
		}
	}
}
