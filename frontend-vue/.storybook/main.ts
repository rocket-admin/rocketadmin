import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
	// Stories live next to the component they document.
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
	addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
	framework: {
		name: '@storybook/vue3-vite',
		options: {},
	},
};

export default config;
