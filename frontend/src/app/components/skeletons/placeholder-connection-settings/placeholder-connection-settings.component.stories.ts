import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderConnectionSettingsComponent } from './placeholder-connection-settings.component';

const meta: Meta<PlaceholderConnectionSettingsComponent> = {
	title: 'Skeletons/PlaceholderConnectionSettings',
	component: PlaceholderConnectionSettingsComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderConnectionSettingsComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderConnectionSettingsComponent>;

export const Default: Story = {};
