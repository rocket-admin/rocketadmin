import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderSavedFiltersComponent } from './placeholder-saved-filters.component';

const meta: Meta<PlaceholderSavedFiltersComponent> = {
	title: 'Skeletons/PlaceholderSavedFilters',
	component: PlaceholderSavedFiltersComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderSavedFiltersComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderSavedFiltersComponent>;

export const Default: Story = {};
