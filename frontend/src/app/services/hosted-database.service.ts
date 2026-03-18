import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import {
	CreatedHostedDatabase,
	CreatedHostedDatabaseConnection,
	CreateHostedDatabaseConnectionPayload,
} from '../models/hosted-database';

@Injectable({
	providedIn: 'root',
})
export class HostedDatabaseService {
	constructor(private _http: HttpClient) {}

	createHostedDatabase(companyId: string) {
		return this._http.post<CreatedHostedDatabase>(`/saas/hosted-database/create/${companyId}`, {}).pipe(
			catchError((error) => {
				return throwError(() => new Error(this._getErrorMessage(error)));
			}),
		);
	}

	createConnectionForHostedDatabase(payload: CreateHostedDatabaseConnectionPayload) {
		return this._http.post<CreatedHostedDatabaseConnection>(`/saas/connection/hosted`, payload).pipe(
			catchError((error) => {
				return throwError(() => new Error(this._getErrorMessage(error)));
			}),
		);
	}

	private _getErrorMessage(error: unknown): string {
		if (error && typeof error === 'object' && 'error' in error) {
			const responseError = (error as { error?: { message?: string } }).error;
			if (responseError?.message) {
				return responseError.message;
			}
		}

		if (error instanceof Error && error.message) {
			return error.message;
		}

		return 'Unknown error';
	}
}
