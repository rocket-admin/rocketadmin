import type { Meta, StoryObj } from '@storybook/angular';
import { BreadcrumbsComponent } from './breadcrumbs.component';

const meta: Meta<BreadcrumbsComponent> = {
	title: 'UI/Breadcrumbs',
	component: BreadcrumbsComponent,
	args: {
		crumbs: [
			{ label: 'Home', link: '/' },
			{ label: 'Connections', link: '/connections' },
			{ label: 'PostgreSQL', link: '' },
		],
	},
};

export default meta;
type Story = StoryObj<BreadcrumbsComponent>;

export const Default: Story = {};

export const SingleCrumb: Story = {
	args: { crumbs: [{ label: 'Home', link: '/' }] },
};

export const LongPath: Story = {
	args: {
		crumbs: [
			{ label: 'Home', link: '/' },
			{ label: 'Connections', link: '/connections' },
			{ label: 'PostgreSQL', link: '/connections/pg' },
			{ label: 'users', link: '/connections/pg/users' },
			{ label: 'Record #42', link: '' },
		],
	},
};
