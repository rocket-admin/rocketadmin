import type { Meta, StoryObj } from '@storybook/angular';
import { PlaceholderTableDataComponent } from './placeholder-table-data.component';

const meta: Meta<PlaceholderTableDataComponent> = {
	title: 'Skeletons/PlaceholderTableData',
	component: PlaceholderTableDataComponent,
};

export default meta;
type Story = StoryObj<PlaceholderTableDataComponent>;

export const Default: Story = {};
