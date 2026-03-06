import type { Meta, StoryObj } from '@storybook/angular';
import { PlaceholderTableViewComponent } from './placeholder-table-view.component';

const meta: Meta<PlaceholderTableViewComponent> = {
	title: 'Skeletons/PlaceholderTableView',
	component: PlaceholderTableViewComponent,
};

export default meta;
type Story = StoryObj<PlaceholderTableViewComponent>;

export const Default: Story = {};
