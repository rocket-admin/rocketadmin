import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MasterPasswordDialogComponent } from './master-password-dialog.component';

const mockConnectionsService: Partial<ConnectionsService> = {
	currentConnectionID: 'conn-1',
};

const mockRouter: Partial<Router> = {
	url: '/dashboard/conn-1/tables',
	navigate: () => Promise.resolve(true),
	routeReuseStrategy: { shouldReuseRoute: () => true } as any,
	onSameUrlNavigation: 'ignore' as const,
};

const meta: Meta<MasterPasswordDialogComponent> = {
	title: 'Dialogs/MasterPassword',
	component: MasterPasswordDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
				{ provide: Router, useValue: mockRouter },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<MasterPasswordDialogComponent>;

export const Default: Story = {};
