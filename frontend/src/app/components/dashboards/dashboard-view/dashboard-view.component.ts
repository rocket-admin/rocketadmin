import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
	CompactType,
	DisplayGrid,
	GridsterComponent,
	GridsterConfig,
	GridsterItem,
	GridsterItemComponent,
	GridType,
} from 'angular-gridster2';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { DashboardWidget } from 'src/app/models/dashboard';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { AlertComponent } from '../../ui-components/alert/alert.component';
import { WidgetDeleteDialogComponent } from '../widget-delete-dialog/widget-delete-dialog.component';
import { WidgetEditDialogComponent } from '../widget-edit-dialog/widget-edit-dialog.component';
import { DashboardWidgetComponent } from '../widget-renderers/dashboard-widget/dashboard-widget.component';

interface GridsterWidgetItem extends GridsterItem {
	widget: DashboardWidget;
}

@Component({
	selector: 'app-dashboard-view',
	templateUrl: './dashboard-view.component.html',
	styleUrls: ['./dashboard-view.component.css'],
	encapsulation: ViewEncapsulation.None,
	imports: [
		CommonModule,
		RouterModule,
		MatButtonModule,
		MatIconModule,
		MatMenuModule,
		MatTooltipModule,
		MatSlideToggleModule,
		MatProgressSpinnerModule,
		GridsterComponent,
		GridsterItemComponent,
		AlertComponent,
		DashboardWidgetComponent,
	],
})
export class DashboardViewComponent implements OnInit {
	protected connectionId = signal('');
	protected dashboardId = signal('');
	protected editMode = signal(false);

	private _dashboards = inject(DashboardsService);
	private _connections = inject(ConnectionsService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private dialog = inject(MatDialog);
	private angulartics2 = inject(Angulartics2);
	private title = inject(Title);
	private destroyRef = inject(DestroyRef);

	// Use service signals
	protected dashboard = computed(() => this._dashboards.dashboard());
	protected loading = computed(() => this._dashboards.dashboardLoading());

	// Writable signal for gridster items (gridster needs mutable items)
	protected gridsterItems = signal<GridsterWidgetItem[]>([]);

	// Connection title signal (bridging from legacy Observable-based service)
	private connectionTitle = signal('');

	protected gridsterOptions: GridsterConfig = {
		gridType: GridType.Fit,
		compactType: CompactType.None,
		displayGrid: DisplayGrid.OnDragAndResize,
		pushItems: true,
		draggable: {
			enabled: false,
			ignoreContentClass: 'widget-content',
			ignoreContent: true,
			dragHandleClass: 'widget-header',
		},
		resizable: {
			enabled: false,
			handles: {
				s: true,
				e: true,
				n: true,
				w: true,
				se: true,
				ne: true,
				sw: true,
				nw: true,
			},
		},
		minCols: 12,
		maxCols: 12,
		minRows: 8,
		maxRows: 100,
		defaultItemCols: 4,
		defaultItemRows: 4,
		minItemCols: 2,
		minItemRows: 2,
		maxItemCols: 12,
		maxItemRows: 12,
		itemChangeCallback: (item: GridsterItem) => this._onItemChange(item as GridsterWidgetItem),
	};

	constructor() {
		// Subscribe to connection title (legacy service bridge)
		this._connections
			.getCurrentConnectionTitle()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((title) => this.connectionTitle.set(title));

		// Sync gridster items when dashboard changes
		effect(() => {
			const dashboard = this.dashboard();
			if (dashboard?.widgets) {
				this.gridsterItems.set(
					dashboard.widgets.map((widget) => ({
						x: widget.position_x,
						y: widget.position_y,
						cols: widget.width,
						rows: widget.height,
						widget: widget,
					})),
				);
			} else {
				this.gridsterItems.set([]);
			}
		});

		// Connection title effect
		effect(() => {
			const dashboard = this.dashboard();
			const connectionTitle = this.connectionTitle();
			if (dashboard) {
				this.title.setTitle(`${dashboard.name} | ${connectionTitle || 'Rocketadmin'}`);
			}
		});

		// Edit mode effect
		effect(() => {
			const editMode = this.editMode();
			if (this.gridsterOptions.draggable) {
				this.gridsterOptions.draggable.enabled = editMode;
			}
			if (this.gridsterOptions.resizable) {
				this.gridsterOptions.resizable.enabled = editMode;
			}
			this.gridsterOptions.displayGrid = editMode ? DisplayGrid.Always : DisplayGrid.OnDragAndResize;
			if (this.gridsterOptions.api?.optionsChanged) {
				this.gridsterOptions.api.optionsChanged();
			}
		});
	}

	ngOnInit(): void {
		const connId = this.route.snapshot.paramMap.get('connection-id') || '';
		const dashId = this.route.snapshot.paramMap.get('dashboard-id') || '';
		this.connectionId.set(connId);
		this.dashboardId.set(dashId);
		this._dashboards.setActiveConnection(connId);
		this._dashboards.setActiveDashboard(dashId);
	}

	toggleEditMode(): void {
		this.editMode.update((v) => !v);
		this.angulartics2.eventTrack.next({
			action: `Dashboards: edit mode ${this.editMode() ? 'enabled' : 'disabled'}`,
		});
		posthog.capture(`Dashboards: edit mode ${this.editMode() ? 'enabled' : 'disabled'}`);
	}

	async openAddWidgetDialog(): Promise<void> {
		const dialogRef = this.dialog.open(WidgetEditDialogComponent, {
			width: '600px',
			data: {
				connectionId: this.connectionId(),
				dashboardId: this.dashboardId(),
				widget: null,
			},
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: add widget dialog opened',
		});
		posthog.capture('Dashboards: add widget dialog opened');

		const result = await dialogRef.afterClosed().toPromise();
		if (result) {
			this._dashboards.refreshDashboard();
		}
	}

	async openEditWidgetDialog(widget: DashboardWidget): Promise<void> {
		const dialogRef = this.dialog.open(WidgetEditDialogComponent, {
			width: '600px',
			data: {
				connectionId: this.connectionId(),
				dashboardId: this.dashboardId(),
				widget: widget,
			},
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: edit widget dialog opened',
		});
		posthog.capture('Dashboards: edit widget dialog opened');

		const result = await dialogRef.afterClosed().toPromise();
		if (result) {
			this._dashboards.refreshDashboard();
		}
	}

	async openDeleteWidgetDialog(widget: DashboardWidget): Promise<void> {
		const dialogRef = this.dialog.open(WidgetDeleteDialogComponent, {
			width: '400px',
			data: {
				connectionId: this.connectionId(),
				dashboardId: this.dashboardId(),
				widget: widget,
			},
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: delete widget dialog opened',
		});
		posthog.capture('Dashboards: delete widget dialog opened');

		const result = await dialogRef.afterClosed().toPromise();
		if (result) {
			this._dashboards.refreshDashboard();
		}
	}

	navigateBack(): void {
		this.router.navigate(['/dashboards', this.connectionId()]);
	}

	private async _onItemChange(item: GridsterWidgetItem): Promise<void> {
		const widget = item.widget;
		if (
			widget.position_x !== item.x ||
			widget.position_y !== item.y ||
			widget.width !== item.cols ||
			widget.height !== item.rows
		) {
			// Update local widget state to prevent duplicate saves
			widget.position_x = item.x ?? widget.position_x;
			widget.position_y = item.y ?? widget.position_y;
			widget.width = item.cols ?? widget.width;
			widget.height = item.rows ?? widget.height;

			// Save to backend
			await this._dashboards.updateWidgetPosition(this.connectionId(), this.dashboardId(), widget.id, {
				position_x: widget.position_x,
				position_y: widget.position_y,
				width: widget.width,
				height: widget.height,
			});
		}
	}
}
