import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppBreadcrumbs from './AppBreadcrumbs.vue';

/** Breadcrumb trail (port of Angular's `app-breadcrumbs`): linked crumbs, then the current page. */
const meta = {
	title: 'App/Breadcrumbs',
	component: AppBreadcrumbs,
	tags: ['autodocs'],
	parameters: { layout: 'padded', router: { extraPaths: ['/dashboard/abc', '/dashboard/abc/users'] } },
	args: {
		crumbs: [
			{ label: 'Production DB', link: '/dashboard/abc' },
			{ label: 'users', link: '/dashboard/abc/users' },
			{ label: 'Settings' },
		],
	},
} satisfies Meta<typeof AppBreadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
	render: () => ({
		components: { AppBreadcrumbs },
		template: `
      <div style="display: grid; gap: 1rem;">
        <AppBreadcrumbs :crumbs="[{ label: 'Settings' }]" />
        <AppBreadcrumbs :crumbs="[{ label: 'Production DB', link: '/dashboard/abc' }, { label: 'Widgets' }]" />
        <AppBreadcrumbs :crumbs="[{ label: 'Production DB', link: '/dashboard/abc' }, { label: 'users', link: '/dashboard/abc/users' }, { label: 'Actions' }]" />
      </div>
    `,
	}),
};
