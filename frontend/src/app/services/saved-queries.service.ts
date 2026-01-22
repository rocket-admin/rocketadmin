import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
	CreateSavedQueryPayload,
	QueryExecutionResult,
	SavedQuery,
	TestQueryPayload,
	TestQueryResult,
	UpdateSavedQueryPayload,
} from '../models/saved-query';
import { NotificationsService } from './notifications.service';

@Injectable({
	providedIn: 'root',
})
export class SavedQueriesService {
	private savedQueriesUpdated = new BehaviorSubject<string>('');
	public cast = this.savedQueriesUpdated.asObservable();

	constructor(
		private _http: HttpClient,
		private _notifications: NotificationsService,
	) {}

	fetchSavedQueries(connectionId: string): Observable<SavedQuery[]> {
		return this._http.get<SavedQuery[]>(`/connection/${connectionId}/saved-queries`).pipe(
			map((res) => res),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch saved queries');
				return EMPTY;
			}),
		);
	}

	fetchSavedQuery(connectionId: string, queryId: string): Observable<SavedQuery> {
		return this._http.get<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`).pipe(
			map((res) => res),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch saved query');
				return EMPTY;
			}),
		);
	}

	createSavedQuery(connectionId: string, payload: CreateSavedQueryPayload): Observable<SavedQuery> {
		return this._http.post<SavedQuery>(`/connection/${connectionId}/saved-query`, payload).pipe(
			map((res) => {
				this._notifications.showSuccessSnackbar('Saved query created successfully');
				this.savedQueriesUpdated.next('created');
				return res;
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to create saved query');
				return EMPTY;
			}),
		);
	}

	updateSavedQuery(connectionId: string, queryId: string, payload: UpdateSavedQueryPayload): Observable<SavedQuery> {
		return this._http.put<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`, payload).pipe(
			map((res) => {
				this._notifications.showSuccessSnackbar('Saved query updated successfully');
				this.savedQueriesUpdated.next('updated');
				return res;
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to update saved query');
				return EMPTY;
			}),
		);
	}

	deleteSavedQuery(connectionId: string, queryId: string): Observable<SavedQuery> {
		return this._http.delete<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`).pipe(
			map((res) => {
				this._notifications.showSuccessSnackbar('Saved query deleted successfully');
				this.savedQueriesUpdated.next('deleted');
				return res;
			}),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to delete saved query');
				return EMPTY;
			}),
		);
	}

	executeSavedQuery(connectionId: string, queryId: string, tableName?: string): Observable<QueryExecutionResult> {
		const params: Record<string, string> = {};
		if (tableName) {
			params['tableName'] = tableName;
		}
		return this._http
			.post<QueryExecutionResult>(`/connection/${connectionId}/saved-query/${queryId}/execute`, {}, { params })
			.pipe(
				map((res) => res),
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || 'Failed to execute query');
					return EMPTY;
				}),
			);
	}

	testQuery(connectionId: string, payload: TestQueryPayload): Observable<TestQueryResult> {
		return this._http.post<TestQueryResult>(`/connection/${connectionId}/query/test`, payload).pipe(
			map((res) => res),
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to test query');
				return EMPTY;
			}),
		);
	}
}
