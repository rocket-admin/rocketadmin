import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderBrandingComponent } from './placeholder-branding.component';

const meta: Meta<PlaceholderBrandingComponent> = {
	title: 'Skeletons/PlaceholderBranding',
	component: PlaceholderBrandingComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderBrandingComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderBrandingComponent>;

export const Default: Story = {};
