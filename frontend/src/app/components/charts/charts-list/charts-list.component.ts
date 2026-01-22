import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SavedQuery } from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
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
		MatTableModule,
		MatButtonModule,
		MatIconModule,
		MatMenuModule,
		MatInputModule,
		MatFormFieldModule,
		MatTooltipModule,
		MatDividerModule,
		PlaceholderTableDataComponent,
		AlertComponent,
	],
})
export class ChartsListComponent implements OnInit, OnDestroy {
	public savedQueries: SavedQuery[] = [];
	public filteredQueries: SavedQuery[] = [];
	public loading = true;
	public searchQuery = '';
	public displayedColumns = ['name', 'description', 'updatedAt', 'actions'];
	public connectionId: string;
	public subscriptions: Subscription[] = [];

	private searchSubject = new Subject<string>();

	constructor(
		private _savedQueries: SavedQueriesService,
		private _connections: ConnectionsService,
		private route: ActivatedRoute,
		private router: Router,
		private dialog: MatDialog,
		private angulartics2: Angulartics2,
		private title: Title,
	) {}

	ngOnInit(): void {
		this.connectionId = this.route.snapshot.paramMap.get('connection-id');

		this._connections.getCurrentConnectionTitle().subscribe((connectionTitle) => {
			this.title.setTitle(`Charts | ${connectionTitle || 'Rocketadmin'}`);
		});

		this.loadSavedQueries();

		const searchSub = this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
			this.filterQueries();
		});
		this.subscriptions.push(searchSub);

		const updateSub = this._savedQueries.cast.subscribe((action) => {
			if (action) {
				this.loadSavedQueries();
			}
		});
		this.subscriptions.push(updateSub);
	}

	ngOnDestroy(): void {
		this.subscriptions.forEach((sub) => sub.unsubscribe());
	}

	loadSavedQueries(): void {
		this.loading = true;
		this._savedQueries.fetchSavedQueries(this.connectionId).subscribe((response) => {
			if (response) {
				this.savedQueries = response;
				this.filterQueries();
			}
			this.loading = false;
		});
	}

	filterQueries(): void {
		if (!this.searchQuery) {
			this.filteredQueries = this.savedQueries;
		} else {
			const query = this.searchQuery.toLowerCase();
			this.filteredQueries = this.savedQueries.filter(
				(q) => q.name.toLowerCase().includes(query) || (q.description && q.description.toLowerCase().includes(query)),
			);
		}
	}

	onSearchChange(query: string): void {
		this.searchSubject.next(query);
	}

	openCreatePage(): void {
		this.router.navigate(['/charts', this.connectionId, 'new']);
		this.angulartics2.eventTrack.next({
			action: 'Charts: create chart page opened',
		});
	}

	openEditPage(query: SavedQuery): void {
		this.router.navigate(['/charts', this.connectionId, query.id]);
		this.angulartics2.eventTrack.next({
			action: 'Charts: edit chart page opened',
		});
	}

	openDeleteDialog(query: SavedQuery): void {
		this.dialog.open(ChartDeleteDialogComponent, {
			width: '400px',
			data: { query, connectionId: this.connectionId },
		});
		this.angulartics2.eventTrack.next({
			action: 'Charts: delete chart dialog opened',
		});
	}
}
