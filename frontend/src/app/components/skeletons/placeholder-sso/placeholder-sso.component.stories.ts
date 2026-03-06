import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderSsoComponent } from './placeholder-sso.component';

const meta: Meta<PlaceholderSsoComponent> = {
	title: 'Skeletons/PlaceholderSSO',
	component: PlaceholderSsoComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderSsoComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderSsoComponent>;

export const Default: Story = {};
