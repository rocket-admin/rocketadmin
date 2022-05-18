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
    // const masterKey = localStorage.getItem(`${this._connections.connectionID}__masterKey`);

    request = request.clone({
      setHeaders: {
        GCLID: autoadmin_gclid_cookie,
        // masterpwd: masterKey || undefined
      },
      withCredentials: true
    });

    return next.handle(request);

    // return from(Auth.currentAuthenticatedUser())
    //   .pipe(
    //       switchMap(user => {
    //         let headers = request.headers
    //           .set('Authorization', 'Bearer ' + user.signInUserSession.idToken.jwtToken)
    //           .set('GCLID', autoadmin_gclid_cookie);
    //          if (masterKey) {
    //           headers = headers.set('masterpwd', masterKey);
    //         }
    //         const requestClone = request.clone({
    //           headers,
    //         });
    //         return next.handle(requestClone);
    //       }
    //     )
    //   );
  }
}
