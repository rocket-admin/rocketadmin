import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { DashboardDeleteDialogComponent } from './dashboard-delete-dialog.component';

const mockDashboardsService: Partial<DashboardsService> = {
	deleteDashboard: () => Promise.resolve(null),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<DashboardDeleteDialogComponent> = {
	title: 'Dialogs/DashboardDelete',
	component: DashboardDeleteDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						dashboard: {
							id: 'dash-1',
							name: 'Sales Dashboard',
							description: 'Monthly sales metrics',
							connection_id: 'conn-1',
							created_at: '2024-01-01',
							updated_at: '2024-01-01',
						},
						connectionId: 'conn-1',
					},
				},
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<DashboardDeleteDialogComponent>;

export const Default: Story = {};
