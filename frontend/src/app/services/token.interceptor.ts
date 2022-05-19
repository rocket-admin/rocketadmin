import {
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, from } from 'rxjs';

import { ConnectionsService } from './connections.service';
import { CookieService } from 'ngx-cookie-service';
import { Injectable } from '@angular/core';

// import { Connection } from '../models/connection';
// import { UserService } from './user.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(
    private cookieService: CookieService,
    private _connections: ConnectionsService,
    // private _user: UserService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const autoadmin_gclid_cookie = this.cookieService.get('autoadmin_gclid');
    const connectionID = this._connections.currentConnectionID;

    request = request.clone({
      setHeaders: {
        GCLID: autoadmin_gclid_cookie
      },
      withCredentials: true
    });

    if (connectionID) {
      const masterKey = localStorage.getItem(`${connectionID}__masterKey`) || '';
      request = request.clone({
        setHeaders: {
          masterpwd: masterKey
        },
      });
    };

    return next.handle(request);
  }
}
