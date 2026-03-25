import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ConfigurationStateService } from '../../services/configuration-state.service';

@Component({
	selector: 'app-auto-configure',
	templateUrl: './auto-configure.component.html',
	styleUrls: ['./auto-configure.component.css'],
	imports: [MatButtonModule, RouterModule],
})
export class AutoConfigureComponent implements OnInit {
	private _route = inject(ActivatedRoute);
	private _router = inject(Router);
	private _configState = inject(ConfigurationStateService);

	protected connectionId = signal<string | null>(null);

	async ngOnInit(): Promise<void> {
		const connectionId = this._route.snapshot.paramMap.get('connection-id');
		if (!connectionId) {
			this._router.navigate(['/connections-list']);
			return;
		}

		this.connectionId.set(connectionId);
		await this._configState.startConfiguring(connectionId);
		this._router.navigate(['/dashboard', connectionId]);
	}
}
