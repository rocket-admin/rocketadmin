import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { of } from 'rxjs';
import { UserService } from 'src/app/services/user.service';
import { EnableTwoFADialogComponent } from './enable-two-fa-dialog.component';

const mockUserService: Partial<UserService> = {
	confirm2FA: () => of({ validated: true } as any),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<EnableTwoFADialogComponent> = {
	title: 'Dialogs/EnableTwoFA',
	component: EnableTwoFADialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue:
						'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
				},
				{ provide: UserService, useValue: mockUserService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<EnableTwoFADialogComponent>;

export const Default: Story = {};
