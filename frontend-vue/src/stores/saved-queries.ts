// Port of SavedQueriesService. The saved-queries `httpResource` becomes a TanStack query keyed by
// connection id; the CRUD and execute methods are store actions. Angular's `queriesUpdated` signal
// only made charts-list reload the resource, so the mutations invalidate the list query instead.
//
// Failed requests are reported by the client and then throw the notified ApiError (Angular's
// ApiService resolved null); callers reset their busy state in `finally`.
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { defineStore } from 'pinia';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { api } from '@/api/client';
import { resourceQueryDefaults } from '@/api/query-options';
import type {
	CreateSavedQueryPayload,
	QueryExecutionResult,
	SavedQuery,
	TestQueryPayload,
	TestQueryResult,
	UpdateSavedQueryPayload,
} from '@/models/saved-query';

export const savedQueryKeys = {
	list: (connectionId: string | null | undefined) => ['saved-queries', connectionId ?? null] as const,
};

/** Replaces `setActiveConnection` + `savedQueries()` / `savedQueriesLoading()` / `refreshSavedQueries()`. */
export function useSavedQueriesQuery(connectionId: MaybeRefOrGetter<string | null | undefined>) {
	const query = useQuery({
		...resourceQueryDefaults,
		queryKey: computed(() => savedQueryKeys.list(toValue(connectionId))),
		enabled: computed(() => !!toValue(connectionId)),
		queryFn: ({ queryKey: [, id] }) =>
			api.get<SavedQuery[]>(`/connection/${id}/saved-queries`, { errorMessage: 'Failed to fetch saved queries' }),
	});
	return {
		savedQueries: computed(() => query.data.value ?? []),
		// httpResource's isLoading was also true while reloading.
		loading: computed(() => query.isFetching.value),
		error: computed(() => query.error.value),
		refresh: () => query.refetch(),
		query,
	};
}

export const useSavedQueriesStore = defineStore('savedQueries', () => {
	// Store setup runs inside the app's injection context (pinia uses app.runWithContext).
	const queryClient = useQueryClient();

	function fetchSavedQuery(connectionId: string, queryId: string): Promise<SavedQuery> {
		return api.get<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`);
	}

	async function createSavedQuery(connectionId: string, payload: CreateSavedQueryPayload): Promise<SavedQuery> {
		const query = await api.post<SavedQuery>(`/connection/${connectionId}/saved-query`, payload, {
			successMessage: 'Saved query created successfully',
		});
		if (query) invalidateList(connectionId);
		return query;
	}

	async function updateSavedQuery(
		connectionId: string,
		queryId: string,
		payload: UpdateSavedQueryPayload,
	): Promise<SavedQuery> {
		const query = await api.put<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`, payload, {
			successMessage: 'Saved query updated successfully',
		});
		if (query) invalidateList(connectionId);
		return query;
	}

	async function deleteSavedQuery(connectionId: string, queryId: string): Promise<SavedQuery> {
		const query = await api.delete<SavedQuery>(`/connection/${connectionId}/saved-query/${queryId}`, {
			successMessage: 'Saved query deleted successfully',
		});
		if (query) invalidateList(connectionId);
		return query;
	}

	function executeSavedQuery(connectionId: string, queryId: string, tableName?: string): Promise<QueryExecutionResult> {
		return api.post<QueryExecutionResult>(
			`/connection/${connectionId}/saved-query/${queryId}/execute`,
			{},
			tableName ? { params: { tableName } } : undefined,
		);
	}

	function testQuery(connectionId: string, payload: TestQueryPayload): Promise<TestQueryResult> {
		return api.post<TestQueryResult>(`/connection/${connectionId}/query/test`, payload);
	}

	// Where Angular set `queriesUpdated`, which made charts-list reload its resource.
	function invalidateList(connectionId: string): void {
		queryClient.invalidateQueries({ queryKey: savedQueryKeys.list(connectionId) });
	}

	return { fetchSavedQuery, createSavedQuery, updateSavedQuery, deleteSavedQuery, executeSavedQuery, testQuery };
});
