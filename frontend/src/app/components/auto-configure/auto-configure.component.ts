import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ApiService } from '../../services/api.service';

@Component({
	selector: 'app-auto-configure',
	templateUrl: './auto-configure.component.html',
	styleUrls: ['./auto-configure.component.css'],
	imports: [MatProgressSpinnerModule, MatButtonModule, RouterModule],
})
export class AutoConfigureComponent implements OnInit {
	private _route = inject(ActivatedRoute);
	private _router = inject(Router);
	private _api = inject(ApiService);

	protected connectionId = signal<string | null>(null);
	protected loading = signal(true);
	protected errorMessage = signal<string | null>(null);

	ngOnInit(): void {
		const connectionId = this._route.snapshot.paramMap.get('connection-id');
		if (!connectionId) {
			this._router.navigate(['/connections-list']);
			return;
		}

		this.connectionId.set(connectionId);
		this._configure(connectionId);
	}

	private async _configure(connectionId: string): Promise<void> {
		const result = await this._api.get<string>(`/ai/v2/setup/${connectionId}`, { responseType: 'text' });

		if (result !== null) {
			this._router.navigate([`/dashboard/${connectionId}`]);
		} else {
			this.loading.set(false);
			this.errorMessage.set('Auto-configuration could not be completed. You can still configure your tables manually.');
		}
	}
}
