import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import UiList from './UiList.vue';
import UiListItem from './UiListItem.vue';

function router() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
	});
}

describe('UiList + UiListItem', () => {
	it('is a plain ul of li items by default', () => {
		const wrapper = mount(UiList, { slots: { default: '<li>1</li><li>2</li>' } });

		expect(wrapper.element.tagName).toBe('UL');
		expect(wrapper.findAll('ul > li')).toHaveLength(2);
	});

	it('wraps the list in a named nav with as="nav"', () => {
		const wrapper = mount(UiList, { props: { as: 'nav', label: 'Connection' } });

		expect(wrapper.element.tagName).toBe('NAV');
		expect(wrapper.attributes('aria-label')).toBe('Connection');
		expect(wrapper.find('nav > ul').exists()).toBe(true);
	});

	it('renders leading, title, description and trailing slots', () => {
		const wrapper = mount(UiListItem, {
			slots: { leading: () => 'L', default: () => 'Title', description: () => 'Line', trailing: () => '3' },
		});

		expect(wrapper.element.tagName).toBe('LI');
		expect(wrapper.get('.ui-list-item__leading').text()).toBe('L');
		expect(wrapper.get('.ui-list-item__title').text()).toBe('Title');
		expect(wrapper.get('.ui-list-item__description').text()).toBe('Line');
		expect(wrapper.get('.ui-list-item__trailing').text()).toBe('3');
	});

	it('renders a RouterLink with to, marking the exact-active one current', async () => {
		const r = router();
		await r.push('/connections');
		const Host = defineComponent({
			components: { UiList, UiListItem },
			template: `
        <UiList as="nav" label="Main">
          <UiListItem to="/connections">Connections</UiListItem>
          <UiListItem to="/company">Company</UiListItem>
        </UiList>
      `,
		});
		const wrapper = mount(Host, { global: { plugins: [r] } });
		const links = wrapper.findAll('a');

		expect(links.map((link) => link.attributes('href'))).toEqual(['/connections', '/company']);
		expect(links[0]!.attributes('aria-current')).toBe('page');
		expect(links[0]!.classes()).toContain('ui-list-item__content--active');
		expect(links[1]!.attributes('aria-current')).toBeUndefined();
	});

	it('renders an external link with href', () => {
		const link = mount(UiListItem, { props: { href: 'https://docs.rocketadmin.com/', target: '_blank' } }).get('a');

		expect(link.attributes('href')).toBe('https://docs.rocketadmin.com/');
		expect(link.attributes('rel')).toBe('noopener noreferrer');
	});

	it('renders a button with interactive and emits click', async () => {
		const wrapper = mount(UiListItem, { props: { interactive: true }, slots: { default: () => 'Row' } });
		await wrapper.get('button').trigger('click');

		expect(wrapper.get('button').attributes('type')).toBe('button');
		expect(wrapper.emitted('click')).toHaveLength(1);
	});

	it('does not emit click when disabled, and drops a disabled link', async () => {
		const button = mount(UiListItem, { props: { interactive: true, disabled: true } });
		await button.get('button').trigger('click');
		expect(button.emitted('click')).toBeUndefined();

		expect(
			mount(UiListItem, { props: { href: '/x', disabled: true } })
				.find('a')
				.exists(),
		).toBe(false);
	});

	it('is static content without to, href or interactive', () => {
		const wrapper = mount(UiListItem, { slots: { default: () => 'Text' } });

		expect(wrapper.find('a, button').exists()).toBe(false);
	});
});
