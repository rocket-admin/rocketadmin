import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { of } from 'rxjs';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionDeleteDialogComponent } from './db-connection-delete-dialog.component';

const mockConnectionsService: Partial<ConnectionsService> = {
	deleteConnection: () => of(null as any),
};

const mockRouter: Partial<Router> = {
	navigate: () => Promise.resolve(true),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<DbConnectionDeleteDialogComponent> = {
	title: 'Dialogs/DbConnectionDelete',
	component: DbConnectionDeleteDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						id: 'conn-1',
						title: 'My PostgreSQL Database',
						database: 'test_db',
					},
				},
				{ provide: ConnectionsService, useValue: mockConnectionsService },
				{ provide: Router, useValue: mockRouter },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<DbConnectionDeleteDialogComponent>;

export const Default: Story = {};
