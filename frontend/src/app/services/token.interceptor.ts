import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

import { ConfigurationService } from './configuration.service';
import { ConnectionsService } from './connections.service';
import { CookieService } from 'ngx-cookie-service';
import { Injectable } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { environment } from "../../environments/environment";

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private config;

  constructor(
    private cookieService: CookieService,
    private _connections: ConnectionsService,
    private _configuration: ConfigurationService
  ) {}

  normalizeURL(url: string, baseURL: string): string {
    if (url.startsWith('/assets')) {
      return undefined;
    }
    if (url.startsWith('/saas')) {
      return url;
    }
    if (url.startsWith('http://')) {
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

    if (connectionID && !request.headers.has('masterpwd')) {
      const masterKey = localStorage.getItem(`${connectionID}__masterKey`) || '';
      request = request.clone({
        setHeaders: {
          masterpwd: masterKey
        },
      });
    };
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          localStorage.removeItem('token_expiration')
          location.href = '/login';
        }
        return throwError(error);
      })
    );
  }
}
