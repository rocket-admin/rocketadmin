import type { Meta, StoryObj } from '@storybook/angular';
import { PlaceholderApiKeysListComponent } from './placeholder-api-keys-list.component';

const meta: Meta<PlaceholderApiKeysListComponent> = {
	title: 'Skeletons/PlaceholderApiKeysList',
	component: PlaceholderApiKeysListComponent,
};

export default meta;
type Story = StoryObj<PlaceholderApiKeysListComponent>;

export const Default: Story = {};
