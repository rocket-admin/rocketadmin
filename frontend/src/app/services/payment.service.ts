import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map } from 'rxjs/operators';
import { BehaviorSubject, EMPTY } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(
    private _http: HttpClient,
  ) { }

  intentToPay() {
    return this._http.post<any>(`/user/stripe/intent`, {})
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }
}
