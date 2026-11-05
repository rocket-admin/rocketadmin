import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppBreadcrumbs, { type Breadcrumb } from './AppBreadcrumbs.vue';

function mountCrumbs(crumbs: Breadcrumb[]) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
	});
	return mount(AppBreadcrumbs, { props: { crumbs }, global: { plugins: [router] } });
}

const trail: Breadcrumb[] = [
	{ label: 'Production DB', link: '/dashboard/abc' },
	{ label: 'users', link: '/dashboard/abc/users', queryParams: { page_index: '2' } },
	{ label: 'Settings' },
];

describe('AppBreadcrumbs', () => {
	it('renders a labelled breadcrumb nav as an ordered list', () => {
		const wrapper = mountCrumbs(trail);

		expect(wrapper.get('nav').attributes('aria-label')).toBe('Breadcrumb');
		expect(wrapper.findAll('ol > li')).toHaveLength(3);
	});

	it('links crumbs that have a link, carrying their query params', () => {
		const links = mountCrumbs(trail).findAll('a');

		expect(links).toHaveLength(2);
		expect(links[0]?.attributes('href')).toBe('/dashboard/abc');
		expect(links[1]?.attributes('href')).toBe('/dashboard/abc/users?page_index=2');
	});

	it('renders a crumb without a link as static text marked as the current page', () => {
		const current = mountCrumbs(trail).get('.app-breadcrumbs__current');

		expect(current.text()).toBe('Settings');
		expect(current.attributes('aria-current')).toBe('page');
	});

	it('puts a chevron between crumbs but not after the last', () => {
		const dividers = mountCrumbs(trail).findAll('.app-breadcrumbs__divider');

		expect(dividers).toHaveLength(2);
		expect(dividers[0]?.text()).toBe('chevron_right');
		expect(dividers[0]?.attributes('aria-hidden')).toBe('true');
	});

	it('renders an empty trail by default', () => {
		expect(mountCrumbs([]).findAll('li')).toHaveLength(0);
	});
});
