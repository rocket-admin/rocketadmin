import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { of } from 'rxjs';
import { UsersService } from 'src/app/services/users.service';
import { UserDeleteDialogComponent } from './user-delete-dialog.component';

const mockUsersService: Partial<UsersService> = {
	cast: of([]),
	deleteGroupUser: () => of(null as any),
};

const meta: Meta<UserDeleteDialogComponent> = {
	title: 'Dialogs/UserDelete',
	component: UserDeleteDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						user: { email: 'user@example.com' },
						group: { id: 'group-1', title: 'Admins' },
					},
				},
				{ provide: UsersService, useValue: mockUsersService },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<UserDeleteDialogComponent>;

export const Default: Story = {};
