import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { of } from 'rxjs';
import { CompanyService } from 'src/app/services/company.service';
import { InviteMemberDialogComponent } from './invite-member-dialog.component';

const mockCompanyService: Partial<CompanyService> = {
	inviteCompanyMember: () => of(null as any),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<InviteMemberDialogComponent> = {
	title: 'Dialogs/InviteMember',
	component: InviteMemberDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						id: 'company-1',
						connections: [
							{
								title: 'Production DB',
								isTestConnection: false,
								groups: [
									{ id: 'group-1', title: 'Admins' },
									{ id: 'group-2', title: 'Readers' },
								],
							},
							{
								title: 'Test DB',
								isTestConnection: true,
								groups: [{ id: 'group-3', title: 'Testers' }],
							},
						],
					},
				},
				{ provide: CompanyService, useValue: mockCompanyService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<InviteMemberDialogComponent>;

export const Default: Story = {};
