import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { AlertType } from 'src/app/models/alert';
import { BannerComponent } from './banner.component';

const meta: Meta<BannerComponent> = {
	title: 'UI/Banner',
	component: BannerComponent,
	decorators: [
		moduleMetadata({
			declarations: [BannerComponent],
		}),
	],
	args: {
		type: AlertType.Info,
	},
	argTypes: {
		type: {
			control: 'select',
			options: [AlertType.Info, AlertType.Warning, AlertType.Error, AlertType.Success],
		},
	},
};

export default meta;
type Story = StoryObj<BannerComponent>;

export const Info: Story = { args: { type: AlertType.Info } };
export const Warning: Story = { args: { type: AlertType.Warning } };
export const ErrorBanner: Story = { args: { type: AlertType.Error } };
export const Success: Story = { args: { type: AlertType.Success } };
