import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { PlaceholderAddUserDialogComponent } from './placeholder-add-user-dialog.component';

const meta: Meta<PlaceholderAddUserDialogComponent> = {
	title: 'Skeletons/PlaceholderAddUserDialog',
	component: PlaceholderAddUserDialogComponent,
	decorators: [
		moduleMetadata({
			declarations: [PlaceholderAddUserDialogComponent],
		}),
	],
};

export default meta;
type Story = StoryObj<PlaceholderAddUserDialogComponent>;

export const Default: Story = {};
