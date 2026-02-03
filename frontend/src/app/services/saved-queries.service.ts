import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { EMPTY, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
	CreateSavedQueryPayload,
	QueryExecutionResult,
	SavedQuery,
	TestQueryPayload,
	TestQueryResult,
	UpdateSavedQueryPayload,
} from '../models/saved-query';
import { NotificationsService } from './notifications.service';

export type QueryUpdateEvent = 'created' | 'updated' | 'deleted' | '';

@Injectable({
	providedIn: 'root',
})
export class SavedQueriesService {
	private _http = inject(HttpClient);
	private _notifications = inject(NotificationsService);

	private _queriesUpdated = signal<QueryUpdateEvent>('');
	public readonly queriesUpdated = this._queriesUpdated.asReadonly();

	// Active connection for reactive fetching
	private _activeConnectionId = signal<string | null>(null);

	// Resource for saved queries
	private _savedQueriesResource = rxResource({
		params: () => this._activeConnectionId(),
		stream: ({ params: connectionId }) => {
			if (!connectionId) return EMPTY;
			return this._http.get<SavedQuery[]>(`/connection/${connectionId}/saved-queries`).pipe(
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch saved queries');
					return EMPTY;
				}),
			);
		},
	});

	// Computed signals for convenient access
	public readonly savedQueries = computed(() => this._savedQueriesResource.value() ?? []);
	public readonly savedQueriesLoading = computed(() => this._savedQueriesResource.isLoading());
	public readonly savedQueriesError = computed(() => this._savedQueriesResource.error() as Error | null);

	// Methods to control resource
	setActiveConnection(connectionId: string): void {
		this._activeConnectionId.set(connectionId);
	}

	refreshSavedQueries(): void {
		this._savedQueriesResource.reload();
	}

	fetchSavedQuery(connectionId: string, queryId: string): Observable<SavedQuery> {
		return this._http.get<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`).pipe(
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to fetch saved query');
				return EMPTY;
			}),
		);
	}

	createSavedQuery(connectionId: string, payload: CreateSavedQueryPayload): Observable<SavedQuery> {
		return this._http.post<SavedQuery>(`/connection/${connectionId}/saved-query`, payload).pipe(
			tap(() => {
				this._notifications.showSuccessSnackbar('Saved query created successfully');
				this._queriesUpdated.set('created');
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
			tap(() => {
				this._notifications.showSuccessSnackbar('Saved query updated successfully');
				this._queriesUpdated.set('updated');
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
			tap(() => {
				this._notifications.showSuccessSnackbar('Saved query deleted successfully');
				this._queriesUpdated.set('deleted');
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
				catchError((err) => {
					console.log(err);
					this._notifications.showErrorSnackbar(err.error?.message || 'Failed to execute query');
					return EMPTY;
				}),
			);
	}

	testQuery(connectionId: string, payload: TestQueryPayload): Observable<TestQueryResult> {
		return this._http.post<TestQueryResult>(`/connection/${connectionId}/query/test`, payload).pipe(
			catchError((err) => {
				console.log(err);
				this._notifications.showErrorSnackbar(err.error?.message || 'Failed to test query');
				return EMPTY;
			}),
		);
	}
}
