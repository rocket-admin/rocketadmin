import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { PanelDeleteDialogComponent } from './panel-delete-dialog.component';

const mockDashboardsService: Partial<DashboardsService> = {
	deleteWidget: () => Promise.resolve(null),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<PanelDeleteDialogComponent> = {
	title: 'Dialogs/PanelDelete',
	component: PanelDeleteDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						connectionId: 'conn-1',
						dashboardId: 'dash-1',
						widget: {
							id: 'widget-1',
							position_x: 0,
							position_y: 0,
							width: 4,
							height: 2,
							query_id: 'query-1',
							dashboard_id: 'dash-1',
						},
					},
				},
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<PanelDeleteDialogComponent>;

export const Default: Story = {};
