import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
import { Dashboard } from 'src/app/models/dashboard';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { PlaceholderDashboardsComponent } from '../../skeletons/placeholder-dashboards/placeholder-dashboards.component';
import { AlertComponent } from '../../ui-components/alert/alert.component';
import { DashboardDeleteDialogComponent } from '../dashboard-delete-dialog/dashboard-delete-dialog.component';
import { DashboardEditDialogComponent } from '../dashboard-edit-dialog/dashboard-edit-dialog.component';
import { DashboardsSidebarComponent } from '../dashboards-sidebar/dashboards-sidebar.component';

@Component({
	selector: 'app-dashboards-list',
	templateUrl: './dashboards-list.component.html',
	styleUrls: ['./dashboards-list.component.css'],
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
		PlaceholderDashboardsComponent,
		AlertComponent,
		DashboardsSidebarComponent,
	],
})
export class DashboardsListComponent implements OnInit {
	protected searchQuery = signal('');
	protected connectionId = signal('');

	private _dashboards = inject(DashboardsService);
	private _connections = inject(ConnectionsService);
	private route = inject(ActivatedRoute);
	private dialog = inject(MatDialog);
	private angulartics2 = inject(Angulartics2);
	private title = inject(Title);
	private destroyRef = inject(DestroyRef);

	// Use service signals for dashboards and loading
	protected dashboards = computed(() => this._dashboards.dashboards());
	protected loading = computed(() => this._dashboards.dashboardsLoading());

	protected filteredDashboards = computed(() => {
		const dashboards = this.dashboards();
		const search = this.searchQuery();
		if (!search) return dashboards;
		const query = search.toLowerCase();
		return dashboards.filter(
			(d) => d.name.toLowerCase().includes(query) || (d.description && d.description.toLowerCase().includes(query)),
		);
	});

	// Connection title signal (bridging from legacy Observable-based service)
	private connectionTitle = signal('');

	constructor() {
		// Subscribe to connection title (legacy service bridge)
		this._connections
			.getCurrentConnectionTitle()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((title) => this.connectionTitle.set(title));

		// Connection title effect
		effect(() => {
			const title = this.connectionTitle();
			this.title.setTitle(`Dashboards | ${title || 'Rocketadmin'}`);
		});

		// Dashboards update effect
		effect(() => {
			const action = this._dashboards.dashboardsUpdated();
			if (action) {
				this._dashboards.refreshDashboards();
				this._dashboards.clearDashboardsUpdated();
			}
		});
	}

	ngOnInit(): void {
		const connId = this.route.snapshot.paramMap.get('connection-id') || '';
		this.connectionId.set(connId);
		this._dashboards.setActiveDashboard(null);
		this._dashboards.setActiveConnection(connId);
	}

	trackViewDashboardOpened(): void {
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: view dashboard opened',
		});
	}

	openCreateDialog(): void {
		this.dialog.open(DashboardEditDialogComponent, {
			width: '500px',
			data: { connectionId: this.connectionId(), dashboard: null },
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: create dashboard dialog opened',
		});
	}

	openEditDialog(dashboard: Dashboard): void {
		this.dialog.open(DashboardEditDialogComponent, {
			width: '500px',
			data: { connectionId: this.connectionId(), dashboard },
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: edit dashboard dialog opened',
		});
	}

	openDeleteDialog(dashboard: Dashboard): void {
		this.dialog.open(DashboardDeleteDialogComponent, {
			width: '400px',
			data: { dashboard, connectionId: this.connectionId() },
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: delete dashboard dialog opened',
		});
	}
}
