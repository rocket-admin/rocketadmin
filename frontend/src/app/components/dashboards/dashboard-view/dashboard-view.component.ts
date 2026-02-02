import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
	Gridster,
	GridsterConfig,
	GridsterItem,
	GridsterItemConfig,
	GridType,
} from 'angular-gridster2';
import { Angulartics2 } from 'angulartics2';
import { DashboardWidget } from 'src/app/models/dashboard';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { AlertComponent } from '../../ui-components/alert/alert.component';
import { WidgetDeleteDialogComponent } from '../widget-delete-dialog/widget-delete-dialog.component';
import { WidgetEditDialogComponent } from '../widget-edit-dialog/widget-edit-dialog.component';
import { ChartWidgetComponent } from '../widget-renderers/chart-widget/chart-widget.component';
import { CounterWidgetComponent } from '../widget-renderers/counter-widget/counter-widget.component';
import { TableWidgetComponent } from '../widget-renderers/table-widget/table-widget.component';
import { TextWidgetComponent } from '../widget-renderers/text-widget/text-widget.component';

interface GridsterWidgetItem extends GridsterItemConfig {
	widget: DashboardWidget;
}

@Component({
	selector: 'app-dashboard-view',
	templateUrl: './dashboard-view.component.html',
	styleUrls: ['./dashboard-view.component.css'],
	imports: [
		CommonModule,
		RouterModule,
		MatButtonModule,
		MatIconModule,
		MatMenuModule,
		MatTooltipModule,
		MatSlideToggleModule,
		MatProgressSpinnerModule,
		Gridster,
		GridsterItem,
		AlertComponent,
		ChartWidgetComponent,
		TableWidgetComponent,
		CounterWidgetComponent,
		TextWidgetComponent,
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

	// Use service signals
	protected dashboard = computed(() => this._dashboards.dashboard());
	protected loading = computed(() => this._dashboards.dashboardLoading());

	// Convert widgets to gridster items
	protected gridsterItems = computed<GridsterWidgetItem[]>(() => {
		const dashboard = this.dashboard();
		if (!dashboard?.widgets) return [];
		return dashboard.widgets.map((widget) => ({
			x: widget.position_x,
			y: widget.position_y,
			cols: widget.width,
			rows: widget.height,
			widget: widget,
		}));
	});

	protected gridsterOptions: GridsterConfig = {
		gridType: GridType.Fit,
		compactType: CompactType.None,
		displayGrid: DisplayGrid.OnDragAndResize,
		pushItems: true,
		draggable: {
			enabled: false,
		},
		resizable: {
			enabled: false,
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
		itemChangeCallback: (item: GridsterItemConfig, itemComponent: GridsterItem) =>
			this._onItemChange(item as GridsterWidgetItem),
	};

	private connectionTitle = toSignal(this._connections.getCurrentConnectionTitle(), { initialValue: '' });

	constructor() {
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
	}

	openAddWidgetDialog(): void {
		const dialogRef = this.dialog.open(WidgetEditDialogComponent, {
			width: '600px',
			data: {
				connectionId: this.connectionId(),
				dashboardId: this.dashboardId(),
				widget: null,
			},
		});
		dialogRef.afterClosed().subscribe((result) => {
			if (result) {
				this._dashboards.refreshDashboard();
			}
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: add widget dialog opened',
		});
	}

	openEditWidgetDialog(widget: DashboardWidget): void {
		const dialogRef = this.dialog.open(WidgetEditDialogComponent, {
			width: '600px',
			data: {
				connectionId: this.connectionId(),
				dashboardId: this.dashboardId(),
				widget: widget,
			},
		});
		dialogRef.afterClosed().subscribe((result) => {
			if (result) {
				this._dashboards.refreshDashboard();
			}
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: edit widget dialog opened',
		});
	}

	openDeleteWidgetDialog(widget: DashboardWidget): void {
		const dialogRef = this.dialog.open(WidgetDeleteDialogComponent, {
			width: '400px',
			data: {
				connectionId: this.connectionId(),
				dashboardId: this.dashboardId(),
				widget: widget,
			},
		});
		dialogRef.afterClosed().subscribe((result) => {
			if (result) {
				this._dashboards.refreshDashboard();
			}
		});
		this.angulartics2.eventTrack.next({
			action: 'Dashboards: delete widget dialog opened',
		});
	}

	navigateBack(): void {
		this.router.navigate(['/dashboards', this.connectionId()]);
	}

	private _onItemChange(item: GridsterWidgetItem): void {
		const widget = item.widget;
		if (
			widget.position_x !== item.x ||
			widget.position_y !== item.y ||
			widget.width !== item.cols ||
			widget.height !== item.rows
		) {
			this._dashboards
				.updateWidgetPosition(this.connectionId(), this.dashboardId(), widget.id, {
					position_x: item.x,
					position_y: item.y,
					width: item.cols,
					height: item.rows,
				})
				.subscribe();
		}
	}
}
