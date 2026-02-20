import { HttpResourceRef } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import {
	CreateSavedQueryPayload,
	QueryExecutionResult,
	SavedQuery,
	TestQueryPayload,
	TestQueryResult,
	UpdateSavedQueryPayload,
} from '../models/saved-query';
import { ApiService } from './api.service';

export type QueryUpdateEvent = 'created' | 'updated' | 'deleted' | '';

@Injectable({
	providedIn: 'root',
})
export class SavedQueriesService {
	private _api = inject(ApiService);

	private _queriesUpdated = signal<QueryUpdateEvent>('');
	public readonly queriesUpdated = this._queriesUpdated.asReadonly();

	// Active connection for reactive fetching
	private _activeConnectionId = signal<string | null>(null);

	// Resource for saved queries
	private _savedQueriesResource: HttpResourceRef<SavedQuery[] | undefined> = this._api.resource<SavedQuery[]>(
		() => {
			const connectionId = this._activeConnectionId();
			if (!connectionId) return undefined;
			return `/connection/${connectionId}/saved-queries`;
		},
		{ errorMessage: 'Failed to fetch saved queries' },
	);

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

	async fetchSavedQuery(connectionId: string, queryId: string): Promise<SavedQuery | null> {
		return this._api.get<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`);
	}

	async createSavedQuery(connectionId: string, payload: CreateSavedQueryPayload): Promise<SavedQuery | null> {
		const query = await this._api.post<SavedQuery>(`/connection/${connectionId}/saved-query`, payload, {
			successMessage: 'Saved query created successfully',
		});
		if (query) this._queriesUpdated.set('created');
		return query;
	}

	async updateSavedQuery(
		connectionId: string,
		queryId: string,
		payload: UpdateSavedQueryPayload,
	): Promise<SavedQuery | null> {
		const query = await this._api.put<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`, payload, {
			successMessage: 'Saved query updated successfully',
		});
		if (query) this._queriesUpdated.set('updated');
		return query;
	}

	async deleteSavedQuery(connectionId: string, queryId: string): Promise<SavedQuery | null> {
		const query = await this._api.delete<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`, {
			successMessage: 'Saved query deleted successfully',
		});
		if (query) this._queriesUpdated.set('deleted');
		return query;
	}

	async executeSavedQuery(
		connectionId: string,
		queryId: string,
		tableName?: string,
	): Promise<QueryExecutionResult | null> {
		return this._api.post<QueryExecutionResult>(
			`/connection/${connectionId}/saved-query/${queryId}/execute`,
			{},
			tableName ? { params: { tableName } } : undefined,
		);
	}

	async testQuery(connectionId: string, payload: TestQueryPayload): Promise<TestQueryResult | null> {
		return this._api.post<TestQueryResult>(`/connection/${connectionId}/query/test`, payload);
	}
}
