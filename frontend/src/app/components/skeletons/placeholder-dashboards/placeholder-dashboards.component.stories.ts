import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderDashboardsComponent } from './placeholder-dashboards.component';

const meta: Meta<PlaceholderDashboardsComponent> = {
	title: 'Skeletons/PlaceholderDashboards',
	component: PlaceholderDashboardsComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderDashboardsComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderDashboardsComponent>;

export const Default: Story = {};
