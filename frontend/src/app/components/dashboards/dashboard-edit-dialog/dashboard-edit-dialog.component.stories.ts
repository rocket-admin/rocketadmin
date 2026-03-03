import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { DashboardEditDialogComponent } from './dashboard-edit-dialog.component';

const mockDashboardsService: Partial<DashboardsService> = {
	createDashboard: () => Promise.resolve(null),
	updateDashboard: () => Promise.resolve(null),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<DashboardEditDialogComponent> = {
	title: 'Dialogs/DashboardEdit',
	component: DashboardEditDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						connectionId: 'conn-1',
						dashboard: null,
					},
				},
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<DashboardEditDialogComponent>;

export const CreateNew: Story = {};

export const EditExisting: Story = {
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						connectionId: 'conn-1',
						dashboard: {
							id: 'dash-1',
							name: 'Sales Dashboard',
							description: 'Monthly sales metrics and KPIs',
							connection_id: 'conn-1',
							created_at: '2024-01-01',
							updated_at: '2024-01-01',
						},
					},
				},
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};
