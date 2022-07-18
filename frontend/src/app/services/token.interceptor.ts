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
import { ConfigurationService } from './configuration.service';
import { map } from 'rxjs/internal/operators/map';
import { switchMap } from 'rxjs/operators';

// import { Connection } from '../models/connection';
// import { UserService } from './user.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private config;

  constructor(
    private cookieService: CookieService,
    private _connections: ConnectionsService,
    private _configuration: ConfigurationService
    // private _user: UserService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    this.config = this._configuration.getConfig();
    const autoadmin_gclid_cookie = this.cookieService.get('autoadmin_gclid');
    const connectionID = this._connections.currentConnectionID;

    return this.config.asObservable().pipe(
      switchMap((config: any) => {
        request = request.clone({
          url: request.url.startsWith('/assets') ? undefined : `${config.baseURL}${request.url}`,
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

      })
    );
  }
}
