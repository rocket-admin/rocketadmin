import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
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
export class ChartsListComponent implements OnInit {
	protected searchQuery = signal('');
	protected connectionId = signal('');
	public displayedColumns = ['name', 'description', 'updatedAt', 'actions'];

	private _savedQueries = inject(SavedQueriesService);
	private _connections = inject(ConnectionsService);
	private route = inject(ActivatedRoute);
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
	}

	trackEditPageOpened(): void {
		this.angulartics2.eventTrack.next({
			action: 'Charts: edit chart page opened',
		});
	}

	openDeleteDialog(query: SavedQuery): void {
		this.dialog.open(ChartDeleteDialogComponent, {
			width: '400px',
			data: { query, connectionId: this.connectionId() },
		});
		this.angulartics2.eventTrack.next({
			action: 'Charts: delete chart dialog opened',
		});
	}
}
