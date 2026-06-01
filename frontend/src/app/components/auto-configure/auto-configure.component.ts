import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { ConfigProgress, ConfigurationStateService } from '../../services/configuration-state.service';

@Component({
	selector: 'app-auto-configure',
	templateUrl: './auto-configure.component.html',
	styleUrls: ['./auto-configure.component.css'],
	imports: [CommonModule, MatButtonModule, RouterModule],
})
export class AutoConfigureComponent implements OnInit, OnDestroy {
	private _route = inject(ActivatedRoute);
	private _router = inject(Router);
	private _configState = inject(ConfigurationStateService);

	protected connectionId = signal<string | null>(null);
	protected progress = signal<ConfigProgress | null>(null);
	private _progressSub?: Subscription;

	protected percent = computed(() => {
		const p = this.progress();
		if (!p || !p.total || p.total <= 0) return null;
		const pct = ((p.current ?? 0) / p.total) * 100;
		return Math.min(100, Math.max(0, Math.round(pct)));
	});

	async ngOnInit(): Promise<void> {
		const connectionId = this._route.snapshot.paramMap.get('connection-id');
		if (!connectionId) {
			this._router.navigate(['/connections-list']);
			return;
		}

		this.connectionId.set(connectionId);
		this._progressSub = this._configState.progress$.subscribe((p) => this.progress.set(p));
		await this._configState.startConfiguring(connectionId);
		this._router.navigate(['/dashboard', connectionId]);
	}

	ngOnDestroy(): void {
		this._progressSub?.unsubscribe();
	}
}
