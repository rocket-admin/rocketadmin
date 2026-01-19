import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentMethod } from '@stripe/stripe-js';
import { EMPTY } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AlertActionType, AlertType } from '../models/alert';
import { ConfigurationService } from './configuration.service';
import { NotificationsService } from './notifications.service';

@Injectable({
	providedIn: 'root',
})
export class PaymentService {
	constructor(
		private _http: HttpClient,
		private _notifications: NotificationsService,
		private _configuration: ConfigurationService,
	) {}

	createIntentToSubscription(companyId: string) {
		const config = this._configuration.getConfig();

		return this._http.post<any>(config.saasURL + `/saas/company/stripe/${companyId}`, {}).pipe(
			map((res) => res),
			catchError((err) => {
				console.log(err);
				this._notifications.showAlert(AlertType.Error, err.error?.message || err.message, [
					{
						type: AlertActionType.Button,
						caption: 'Dismiss',
						action: (_id: number) => this._notifications.dismissAlert(),
					},
				]);
				return EMPTY;
			}),
		);
	}

	createSubscription(
		companyId: string,
		defaultPaymentMethodId: string | null | PaymentMethod,
		subscriptionLevel: string,
	) {
		const config = this._configuration.getConfig();

		return this._http
			.post<any>(config.saasURL + `/saas/company/setup/intent/${companyId}`, {
				defaultPaymentMethodId,
				subscriptionLevel,
			})
			.pipe(
				map((res) => res),
				catchError((err) => {
					console.log(err);
					this._notifications.showAlert(AlertType.Error, err.error?.message || err.message, [
						{
							type: AlertActionType.Button,
							caption: 'Dismiss',
							action: (_id: number) => this._notifications.dismissAlert(),
						},
					]);
					return EMPTY;
				}),
			);
	}

	changeSubscription(companyId: string, subscriptionLevel: string) {
		const config = this._configuration.getConfig();

		return this._http
			.post<any>(config.saasURL + `/saas/company/subscription/upgrade/${companyId}`, { subscriptionLevel })
			.pipe(
				map((res) => res),
				catchError((err) => {
					console.log(err);
					this._notifications.showAlert(AlertType.Error, err.error?.message || err.message, [
						{
							type: AlertActionType.Button,
							caption: 'Dismiss',
							action: (_id: number) => this._notifications.dismissAlert(),
						},
					]);
					return EMPTY;
				}),
			);
	}
}
