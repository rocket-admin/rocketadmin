import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderConnectionsComponent } from './placeholder-connections.component';

const meta: Meta<PlaceholderConnectionsComponent> = {
	title: 'Skeletons/PlaceholderConnections',
	component: PlaceholderConnectionsComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderConnectionsComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderConnectionsComponent>;

export const Default: Story = {};
