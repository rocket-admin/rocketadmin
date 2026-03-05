import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderUserGroupComponent } from './placeholder-user-group.component';

const meta: Meta<PlaceholderUserGroupComponent> = {
	title: 'Skeletons/PlaceholderUserGroup',
	component: PlaceholderUserGroupComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderUserGroupComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderUserGroupComponent>;

export const Default: Story = {};
