import type { Meta, StoryObj } from '@storybook/angular';
import { UserPasswordComponent } from './user-password.component';

const meta: Meta<UserPasswordComponent> = {
	title: 'UI/UserPassword',
	component: UserPasswordComponent,
	args: {
		value: '',
		label: 'Password',
	},
};

export default meta;
type Story = StoryObj<UserPasswordComponent>;

export const Empty: Story = {};

export const WithValue: Story = {
	args: { value: 'MyStr0ngP@ss!' },
};

export const CustomLabel: Story = {
	args: { label: 'Confirm Password', value: '' },
};
