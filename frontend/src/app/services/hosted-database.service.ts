import { Injectable, inject } from '@angular/core';
import { CreatedHostedDatabase, FoundHostedDatabase } from '../models/hosted-database';
import { ApiService } from './api.service';

@Injectable({
	providedIn: 'root',
})
export class HostedDatabaseService {
	private _api = inject(ApiService);

	createHostedDatabase(companyId: string): Promise<CreatedHostedDatabase | null> {
		return this._api.post<CreatedHostedDatabase>(`/saas/hosted-database/create/${companyId}`, {});
	}

	listHostedDatabases(companyId: string): Promise<FoundHostedDatabase[] | null> {
		return this._api.get<FoundHostedDatabase[]>(`/saas/hosted-database/${companyId}`);
	}

	deleteHostedDatabase(companyId: string, hostedDatabaseId: string): Promise<{ success: boolean } | null> {
		return this._api.delete<{ success: boolean }>(`/saas/hosted-database/delete/${companyId}/${hostedDatabaseId}`);
	}

	resetHostedDatabasePassword(companyId: string, hostedDatabaseId: string): Promise<CreatedHostedDatabase | null> {
		return this._api.post<CreatedHostedDatabase>(
			`/saas/hosted-database/reset-password/${companyId}/${hostedDatabaseId}`,
			{},
		);
	}
}
