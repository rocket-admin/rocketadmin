import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ContentLoaderComponent } from './content-loader.component';

const meta: Meta<ContentLoaderComponent> = {
	title: 'UI/ContentLoader',
	component: ContentLoaderComponent,
	decorators: [
		moduleMetadata({
			declarations: [ContentLoaderComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<ContentLoaderComponent>;

export const Default: Story = {};
