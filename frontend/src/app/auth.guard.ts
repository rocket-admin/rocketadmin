import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { differenceInMilliseconds } from 'date-fns'

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor() {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    try {
      const expirationToken = localStorage.getItem('token_expiration');
      let expirationTime = null;
      if (expirationToken) expirationTime = new Date(expirationToken);
      const currantTime = new Date();

    if (expirationTime && currantTime) {
      const expirationInterval = differenceInMilliseconds(expirationTime, currantTime);
      if (expirationInterval > 0) return true;
    }
    return false;
    } catch {
      return false;
    }
  }
}
