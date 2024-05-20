import {
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, ReplaySubject, from } from 'rxjs';

import { ConnectionsService } from './connections.service';
import { CookieService } from 'ngx-cookie-service';
import { Injectable } from '@angular/core';
import { ConfigurationService } from './configuration.service';
import { switchMap } from 'rxjs/operators';
import { environment } from "../../environments/environment";

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

  normalizeURL(url: string, baseURL: string): string {
    if (url.startsWith('/assets')) {
      return undefined;
    }
    if (url.startsWith('https://')) {
      return url;
    }
    return `${baseURL}${url}`;
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    this.config = this._configuration.getConfig();
    const autoadmin_gclid_cookie = this.cookieService.get('autoadmin_gclid');
    const connectionID = this._connections.currentConnectionID;

    request = request.clone({
      url: this.normalizeURL(request.url, environment.apiRoot || this.config.baseURL),
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
