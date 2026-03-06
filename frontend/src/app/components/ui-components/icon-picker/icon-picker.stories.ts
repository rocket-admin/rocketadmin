import type { Meta, StoryObj } from '@storybook/angular';
import { IconPickerComponent } from './icon-picker.component';

const meta: Meta<IconPickerComponent> = {
	title: 'UI/IconPicker',
	component: IconPickerComponent,
	args: {
		icon: 'database',
		defaultIcons: ['database', 'table_chart', 'settings', 'person', 'lock', 'vpn_key'],
		tooltip: 'Choose an icon',
		resetButtonShown: true,
	},
};

export default meta;
type Story = StoryObj<IconPickerComponent>;

export const Default: Story = {};

export const WithoutReset: Story = {
	args: { resetButtonShown: false },
};

export const NoIcon: Story = {
	args: { icon: '', tooltip: 'Select icon' },
};
