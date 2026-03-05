import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NotificationsService } from 'src/app/services/notifications.service';
import { IpAddressButtonComponent } from './ip-address-button.component';

const meta: Meta<IpAddressButtonComponent> = {
	title: 'UI/IPAddressButton',
	component: IpAddressButtonComponent,
	decorators: [
		applicationConfig({
			providers: [{ provide: NotificationsService, useValue: { showSuccessSnackbar: () => {} } }],
		}),
	],
	args: {
		ip: '192.168.1.100',
	},
};

export default meta;
type Story = StoryObj<IpAddressButtonComponent>;

export const Default: Story = {};

export const IPv6: Story = {
	args: { ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
};
