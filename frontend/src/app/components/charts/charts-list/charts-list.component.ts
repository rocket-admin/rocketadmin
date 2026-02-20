import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { ChartType, SavedQuery } from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { ChartMiniPreviewComponent } from '../../dashboards/chart-mini-preview/chart-mini-preview.component';
import { DashboardsSidebarComponent } from '../../dashboards/dashboards-sidebar/dashboards-sidebar.component';
import { PlaceholderTableDataComponent } from '../../skeletons/placeholder-table-data/placeholder-table-data.component';
import { AlertComponent } from '../../ui-components/alert/alert.component';
import { ChartDeleteDialogComponent } from '../chart-delete-dialog/chart-delete-dialog.component';

@Component({
	selector: 'app-charts-list',
	templateUrl: './charts-list.component.html',
	styleUrls: ['./charts-list.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
		MatButtonModule,
		MatCardModule,
		MatIconModule,
		MatMenuModule,
		MatInputModule,
		MatFormFieldModule,
		MatTooltipModule,
		MatDividerModule,
		MatTableModule,
		ChartMiniPreviewComponent,
		PlaceholderTableDataComponent,
		AlertComponent,
		DashboardsSidebarComponent,
	],
})
export class ChartsListComponent implements OnInit {
	protected searchQuery = signal('');
	protected connectionId = signal('');
	displayedColumns = ['preview', 'name', 'description', 'updated', 'actions'];

	private chartTypeIcons: Record<ChartType, string> = {
		bar: 'bar_chart',
		line: 'show_chart',
		pie: 'pie_chart',
		doughnut: 'donut_large',
		polarArea: 'radar',
	};

	getChartIcon(chartType: ChartType | null): string {
		return chartType ? this.chartTypeIcons[chartType] : 'bar_chart';
	}

	getChartTypeName(chartType: ChartType | null): string {
		const names: Record<ChartType, string> = {
			bar: 'Bar Chart',
			line: 'Line Chart',
			pie: 'Pie Chart',
			doughnut: 'Doughnut Chart',
			polarArea: 'Polar Area Chart',
		};
		return chartType ? names[chartType] : 'Bar Chart';
	}

	private _savedQueries = inject(SavedQueriesService);
	private _connections = inject(ConnectionsService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private dialog = inject(MatDialog);
	private angulartics2 = inject(Angulartics2);
	private title = inject(Title);

	// Use service signals for saved queries and loading
	protected savedQueries = computed(() => this._savedQueries.savedQueries());
	protected loading = computed(() => this._savedQueries.savedQueriesLoading());

	protected filteredQueries = computed(() => {
		const queries = this.savedQueries();
		const search = this.searchQuery();
		if (!search) return queries;
		const query = search.toLowerCase();
		return queries.filter(
			(q) => q.name.toLowerCase().includes(query) || (q.description && q.description.toLowerCase().includes(query)),
		);
	});

	private connectionTitle = toSignal(this._connections.getCurrentConnectionTitle(), { initialValue: '' });

	constructor() {
		// Connection title effect
		effect(() => {
			const title = this.connectionTitle();
			this.title.setTitle(`Charts | ${title || 'Rocketadmin'}`);
		});

		// Queries update effect
		effect(() => {
			const action = this._savedQueries.queriesUpdated();
			if (action) this._savedQueries.refreshSavedQueries();
		});
	}

	ngOnInit(): void {
		const connId = this.route.snapshot.paramMap.get('connection-id') || '';
		this.connectionId.set(connId);
		this._savedQueries.setActiveConnection(connId);
	}

	trackCreatePageOpened(): void {
		this.angulartics2.eventTrack.next({
			action: 'Charts: create chart page opened',
		});
		posthog.capture('Charts: create chart page opened');
	}

	trackEditPageOpened(): void {
		this.angulartics2.eventTrack.next({
			action: 'Charts: edit chart page opened',
		});
		posthog.capture('Charts: edit chart page opened');
	}

	openQuery(query: SavedQuery): void {
		this.trackEditPageOpened();
		this.router.navigate(['/panels', this.connectionId(), query.id]);
	}

	openDeleteDialog(query: SavedQuery): void {
		this.dialog.open(ChartDeleteDialogComponent, {
			width: '400px',
			data: { query, connectionId: this.connectionId() },
		});
		this.angulartics2.eventTrack.next({
			action: 'Charts: delete chart dialog opened',
		});
		posthog.capture('Charts: delete chart dialog opened');
	}

	formatUpdatedAt(date: string): string {
		const now = new Date();
		const updated = new Date(date);
		const diffMs = now.getTime() - updated.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} min ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

		return updated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
}
