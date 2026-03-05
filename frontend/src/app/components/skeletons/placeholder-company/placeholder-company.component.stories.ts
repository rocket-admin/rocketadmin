import type { Meta, StoryObj } from '@storybook/angular';
import { PlaceholderCompanyComponent } from './placeholder-company.component';

const meta: Meta<PlaceholderCompanyComponent> = {
	title: 'Skeletons/PlaceholderCompany',
	component: PlaceholderCompanyComponent,
};

export default meta;
type Story = StoryObj<PlaceholderCompanyComponent>;

export const Default: Story = {};
