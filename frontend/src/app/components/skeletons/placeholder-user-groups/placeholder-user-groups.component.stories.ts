import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderUserGroupsComponent } from './placeholder-user-groups.component';

const meta: Meta<PlaceholderUserGroupsComponent> = {
	title: 'Skeletons/PlaceholderUserGroups',
	component: PlaceholderUserGroupsComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderUserGroupsComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderUserGroupsComponent>;

export const Default: Story = {};
