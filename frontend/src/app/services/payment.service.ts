import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map } from 'rxjs/operators';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { PaymentMethod } from '@stripe/stripe-js/types/api';
import { NotificationsService } from './notifications.service';
import { AlertActionType, AlertType } from '../models/alert';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService,
  ) { }

  createIntentToSubscription() {
    return this._http.post<any>(`/user/stripe/intent`, {})
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, err.error.message, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  createSubscription(dafaultPaymentMethodId: string | null | PaymentMethod, subscriptionLevel: string) {
    return this._http.post<any>(`/user/setup/intent`, {dafaultPaymentMethodId, subscriptionLevel})
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, err.error.message, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }
}
