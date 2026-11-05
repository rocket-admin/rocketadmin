// Port of TableSchemaService: AI-generated schema changes (generate / approve / reject a batch) and
// the connection ER diagram with its preview.
//
// generate, approve and preview never notified in Angular: they throw and the schema editor shows
// the message inline. reject and fetchDiagram report the error through the client and then throw the
// notified ApiError, like every other store (Angular's ApiService resolved null instead).
import { defineStore } from 'pinia';
import { api, isApiError } from '@/api/client';

export interface ConnectionDiagramResponse {
	connectionId: string;
	databaseType: string;
	diagram: string;
	description: string;
	generatedAt: string;
}

export interface ConnectionDiagramPreviewStatementResult {
	sql: string;
	status: 'applied' | 'skipped' | 'error';
	message?: string;
}

export interface ConnectionDiagramPreviewDiff {
	addedTables: string[];
	droppedTables: string[];
	addedColumns: Record<string, string[]>;
	droppedColumns: Record<string, string[]>;
	addedForeignKeys: Record<string, string[]>;
	statementResults: ConnectionDiagramPreviewStatementResult[];
}

export interface ConnectionDiagramPreviewResponse {
	connectionId: string;
	databaseType: string;
	diagram: string;
	description: string;
	diff: ConnectionDiagramPreviewDiff;
	generatedAt: string;
}

export interface SchemaChangeResponse {
	id: string;
	connectionId: string;
	batchId: string | null;
	orderInBatch: number;
	forwardSql: string;
	rollbackSql: string | null;
	userModifiedSql: string | null;
	status: string;
	changeType: string;
	targetTableName: string;
	databaseType: string;
	executionError: string | null;
	isReversible: boolean;
	userPrompt: string;
	aiSummary: string | null;
	aiReasoning: string | null;
	createdAt: string;
	appliedAt: string | null;
	rolledBackAt: string | null;
	aiAutoFixApplied?: boolean;
	aiAutoFixOriginalForwardSql?: string | null;
	aiAutoFixOriginalRollbackSql?: string | null;
	aiAutoFixOriginalError?: string | null;
}

export interface SchemaChangeBatchResponse {
	batchId: string | null;
	changes: SchemaChangeResponse[];
	threadId?: string | null;
	assistantMessage?: string | null;
}

export const useTableSchemaStore = defineStore('tableSchema', () => {
	function generateSchemaChange(
		connectionId: string,
		userPrompt: string,
		threadId?: string,
	): Promise<SchemaChangeBatchResponse> {
		return postOrThrow(`/table-schema/${connectionId}/generate`, { userPrompt, threadId });
	}

	function approveBatch(batchId: string, confirmedDestructive?: boolean): Promise<SchemaChangeBatchResponse> {
		return postOrThrow(`/table-schema/batch/${batchId}/approve`, { confirmedDestructive });
	}

	function rejectBatch(batchId: string): Promise<SchemaChangeBatchResponse> {
		return api.post<SchemaChangeBatchResponse>(`/table-schema/batch/${batchId}/reject`);
	}

	function fetchDiagram(connectionId: string): Promise<ConnectionDiagramResponse> {
		return api.get<ConnectionDiagramResponse>(`/connection/diagram/${connectionId}`);
	}

	function previewDiagram(connectionId: string, sqlCommands: string[]): Promise<ConnectionDiagramPreviewResponse> {
		return postOrThrow(`/connection/diagram/${connectionId}/preview`, { sqlCommands });
	}

	return { generateSchemaChange, approveBatch, rejectBatch, fetchDiagram, previewDiagram };
});

/** Throws an Error carrying the server's message (or `Request failed (<status>)`), showing nothing. */
async function postOrThrow<T>(url: string, body: unknown): Promise<T> {
	try {
		return await api.post<T>(url, body, { notify: false });
	} catch (error) {
		if (isApiError(error) && !error.body.message) throw new Error(`Request failed (${error.status})`);
		throw error;
	}
}
