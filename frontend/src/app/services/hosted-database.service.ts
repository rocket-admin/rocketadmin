import { Injectable, inject } from '@angular/core';
import { CreatedHostedDatabase } from '../models/hosted-database';
import { ApiService } from './api.service';

@Injectable({
	providedIn: 'root',
})
export class HostedDatabaseService {
	private _api = inject(ApiService);

	createHostedDatabase(companyId: string): Promise<CreatedHostedDatabase | null> {
		return this._api.post<CreatedHostedDatabase>(`/saas/hosted-database/create/${companyId}`, {});
	}
}
