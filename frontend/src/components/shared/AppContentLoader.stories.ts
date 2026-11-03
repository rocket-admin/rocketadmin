import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppContentLoader from './AppContentLoader.vue';

/** Centred loader over its positioned container (port of Angular's `app-content-loader`). */
const meta = {
	title: 'App/ContentLoader',
	component: AppContentLoader,
	tags: ['autodocs'],
	parameters: { layout: 'padded' },
	render: (args) => ({
		components: { AppContentLoader },
		setup: () => ({ args }),
		template:
			'<div style="position: relative; height: 12rem; border: 1px dashed var(--color-line);"><AppContentLoader v-bind="args" /></div>',
	}),
} satisfies Meta<typeof AppContentLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
