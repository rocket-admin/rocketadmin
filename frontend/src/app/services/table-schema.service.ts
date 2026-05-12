import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

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
}

@Injectable({
	providedIn: 'root',
})
export class TableSchemaService {
	private _api = inject(ApiService);

	async generateSchemaChange(connectionId: string, userPrompt: string): Promise<SchemaChangeBatchResponse | null> {
		return this._api.post<SchemaChangeBatchResponse>(`/table-schema/${connectionId}/generate`, { userPrompt });
	}

	async approveBatch(batchId: string, confirmedDestructive?: boolean): Promise<SchemaChangeBatchResponse | null> {
		return this._api.post<SchemaChangeBatchResponse>(`/table-schema/batch/${batchId}/approve`, {
			confirmedDestructive,
		});
	}

	async rejectBatch(batchId: string): Promise<SchemaChangeBatchResponse | null> {
		return this._api.post<SchemaChangeBatchResponse>(`/table-schema/batch/${batchId}/reject`);
	}
}
