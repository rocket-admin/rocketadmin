import { MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';
import { UsersService } from 'src/app/services/users.service';
import { GroupAddDialogComponent } from './group-add-dialog.component';

const mockConnectionsService: Partial<ConnectionsService> = {
	currentConnectionID: 'conn-1',
};

const mockUsersService: Partial<UsersService> = {
	createGroup: () => Promise.resolve(null),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<GroupAddDialogComponent> = {
	title: 'Dialogs/GroupAdd',
	component: GroupAddDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
				{ provide: UsersService, useValue: mockUsersService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<GroupAddDialogComponent>;

export const Default: Story = {};
