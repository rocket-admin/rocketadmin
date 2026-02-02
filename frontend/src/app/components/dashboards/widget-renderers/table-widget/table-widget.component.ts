import { CommonModule } from '@angular/common';
import { Component, computed, effect, Input, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';

@Component({
	selector: 'app-table-widget',
	templateUrl: './table-widget.component.html',
	styleUrls: ['./table-widget.component.css'],
	imports: [CommonModule, MatTableModule, MatProgressSpinnerModule],
})
export class TableWidgetComponent {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input({ required: true }) connectionId!: string;

	private _savedQueries = inject(SavedQueriesService);

	protected loading = signal(false);
	protected error = signal<string | null>(null);
	protected data = signal<Record<string, unknown>[]>([]);

	protected columns = computed(() => {
		const data = this.data();
		if (!data.length) return [];
		return Object.keys(data[0]);
	});

	constructor() {
		effect(() => {
			if (this.widget?.query_id) {
				this._loadData();
			}
		});
	}

	private _loadData(): void {
		if (!this.widget.query_id) {
			this.error.set('No query linked to this widget');
			return;
		}

		this.loading.set(true);
		this.error.set(null);

		this._savedQueries.executeSavedQuery(this.connectionId, this.widget.query_id).subscribe({
			next: (result) => {
				this.data.set(result.data);
				this.loading.set(false);
			},
			error: (err) => {
				this.error.set(err?.error?.message || 'Failed to load data');
				this.loading.set(false);
			},
		});
	}
}
