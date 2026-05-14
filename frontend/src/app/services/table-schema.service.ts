import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

export interface ConnectionDiagramResponse {
	connectionId: string;
	databaseType: string;
	diagram: string;
	description: string;
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
}

export interface SchemaChangeBatchResponse {
	batchId: string;
	changes: SchemaChangeResponse[];
	threadId?: string | null;
}

@Injectable({
	providedIn: 'root',
})
export class TableSchemaService {
	private _api = inject(ApiService);

	async generateSchemaChange(connectionId: string, userPrompt: string, threadId?: string): Promise<SchemaChangeBatchResponse> {
		return this._fetchOrThrow<SchemaChangeBatchResponse>(`/table-schema/${connectionId}/generate`, { userPrompt, threadId });
	}

	async approveBatch(batchId: string, confirmedDestructive?: boolean): Promise<SchemaChangeBatchResponse> {
		return this._fetchOrThrow<SchemaChangeBatchResponse>(`/table-schema/batch/${batchId}/approve`, {
			confirmedDestructive,
		});
	}

	async rejectBatch(batchId: string): Promise<SchemaChangeBatchResponse | null> {
		return this._api.post<SchemaChangeBatchResponse>(`/table-schema/batch/${batchId}/reject`);
	}

	async fetchDiagram(connectionId: string): Promise<ConnectionDiagramResponse | null> {
		return this._api.get<ConnectionDiagramResponse>(`/connection/diagram/${connectionId}`);
	}

	private async _fetchOrThrow<T>(url: string, body: unknown): Promise<T> {
		const fullUrl = `${environment.apiRoot || '/api'}${url}`;
		const response = await fetch(fullUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const message = errorBody?.message || `Request failed (${response.status})`;
			throw new Error(message);
		}

		return response.json();
	}
}
