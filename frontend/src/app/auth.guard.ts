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
      const expirationTime = new Date(localStorage.getItem('token_expiration'));
      const currantTime = new Date();

    if (expirationTime && currantTime) {
      const expirationInterval = differenceInMilliseconds(expirationTime, currantTime);
      if (expirationInterval > 0) return true;
    }
    } catch {
      return false;
    }
  }
}
