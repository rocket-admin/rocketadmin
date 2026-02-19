import { CommonModule } from '@angular/common';
import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';

@Component({
	selector: 'app-table-panel',
	templateUrl: './table-panel.component.html',
	styleUrls: ['./table-panel.component.css'],
	imports: [CommonModule, MatTableModule, MatProgressSpinnerModule],
})
export class TablePanelComponent implements OnInit {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input({ required: true }) connectionId!: string;
	@Input() preloadedQuery: SavedQuery | null = null;
	@Input() preloadedData: Record<string, unknown>[] = [];

	protected data = signal<Record<string, unknown>[]>([]);

	protected columns = computed(() => {
		const data = this.data();
		if (!data.length) return [];
		return Object.keys(data[0]);
	});

	ngOnInit(): void {
		if (this.preloadedData.length > 0) {
			this.data.set(this.preloadedData);
		}
	}
}
