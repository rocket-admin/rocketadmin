import type { Meta, StoryObj } from '@storybook/angular';
import { TurnstileComponent } from './turnstile.component';

const meta: Meta<TurnstileComponent> = {
	title: 'UI/Turnstile',
	component: TurnstileComponent,
	args: {
		siteKey: '1x00000000000000000000AA',
		theme: 'auto',
	},
	argTypes: {
		theme: {
			control: 'select',
			options: ['light', 'dark', 'auto'],
		},
	},
};

export default meta;
type Story = StoryObj<TurnstileComponent>;

export const Default: Story = {};

export const Light: Story = {
	args: { theme: 'light' },
};

export const Dark: Story = {
	args: { theme: 'dark' },
};
