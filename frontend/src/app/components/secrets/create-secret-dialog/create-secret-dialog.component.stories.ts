import { MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { Angulartics2 } from 'angulartics2';
import { of } from 'rxjs';
import { SecretsService } from 'src/app/services/secrets.service';
import { CreateSecretDialogComponent } from './create-secret-dialog.component';

const mockSecretsService: Partial<SecretsService> = {
	createSecret: () => of(null as any),
};

const mockAngulartics: Partial<Angulartics2> = {
	eventTrack: { next: () => {} } as any,
};

const meta: Meta<CreateSecretDialogComponent> = {
	title: 'Dialogs/CreateSecret',
	component: CreateSecretDialogComponent,
	decorators: [
		applicationConfig({
			providers: [
				{ provide: MatDialogRef, useValue: { close: () => {} } },
				{ provide: SecretsService, useValue: mockSecretsService },
				{ provide: Angulartics2, useValue: mockAngulartics },
			],
		}),
	],
};

export default meta;
type Story = StoryObj<CreateSecretDialogComponent>;

export const Default: Story = {};
