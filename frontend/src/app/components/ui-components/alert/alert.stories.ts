import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { AlertType } from 'src/app/models/alert';
import { NotificationsService } from 'src/app/services/notifications.service';
import { AlertComponent } from './alert.component';

const meta: Meta<AlertComponent> = {
	title: 'UI/Alert',
	component: AlertComponent,
	decorators: [
		applicationConfig({
			providers: [{ provide: NotificationsService, useValue: { currentAlert: null } }],
		}),
	],
	args: {
		alert: { id: 1, type: AlertType.Info, message: 'This is an informational alert.' },
	},
};

export default meta;
type Story = StoryObj<AlertComponent>;

export const Info: Story = {
	args: { alert: { id: 1, type: AlertType.Info, message: 'This is an informational message.' } },
};

export const Warning: Story = {
	args: { alert: { id: 2, type: AlertType.Warning, message: 'This is a warning message.' } },
};

export const ErrorAlert: Story = {
	args: { alert: { id: 3, type: AlertType.Error, message: 'An error has occurred.' } },
};

export const Success: Story = {
	args: { alert: { id: 4, type: AlertType.Success, message: 'Operation completed successfully.' } },
};

export const ComplexMessage: Story = {
	args: {
		alert: {
			id: 5,
			type: AlertType.Error,
			message: {
				abstract: 'Connection failed',
				details: 'Could not connect to the database. Please check your credentials and try again.',
			},
		},
	},
};
