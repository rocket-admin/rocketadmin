import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router';
import UiIconButton from './UiIconButton.vue';

function mountButton(props: Record<string, unknown> = {}) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/', component: { template: '<div />' } }],
	});
	return mount(UiIconButton, { props: { icon: 'menu', label: 'Open menu', ...props }, global: { plugins: [router] } });
}

describe('UiIconButton', () => {
	it('is a <button type="button"> named by its label, with the label as tooltip', () => {
		const wrapper = mountButton();

		expect(wrapper.element.tagName).toBe('BUTTON');
		expect(wrapper.attributes('type')).toBe('button');
		expect(wrapper.attributes('aria-label')).toBe('Open menu');
		expect(wrapper.attributes('title')).toBe('Open menu');
	});

	it('renders the icon decoratively, so the name is not read twice', () => {
		const icon = mountButton().get('.ui-icon');

		expect(icon.text()).toBe('menu');
		expect(icon.attributes('aria-hidden')).toBe('true');
	});

	it('is an <a> when given href, with rel for a new tab', () => {
		const wrapper = mountButton({ href: 'https://docs.rocketadmin.com/', target: '_blank' });

		expect(wrapper.element.tagName).toBe('A');
		expect(wrapper.attributes('href')).toBe('https://docs.rocketadmin.com/');
		expect(wrapper.attributes('rel')).toBe('noopener noreferrer');
		expect(wrapper.attributes('type')).toBeUndefined();
	});

	it('is a RouterLink when given to', () => {
		const wrapper = mountButton({ to: '/' });

		expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
		expect(wrapper.find('a').attributes('href')).toBe('/');
	});

	it('disables natively as a button, and drops href as a link', () => {
		expect(mountButton({ disabled: true }).attributes('disabled')).toBeDefined();

		const link = mountButton({ href: 'https://example.com', disabled: true });
		expect(link.attributes('href')).toBeUndefined();
		expect(link.attributes('aria-disabled')).toBe('true');
		expect(link.attributes('role')).toBe('link');
	});

	it('emits click when enabled', async () => {
		const wrapper = mountButton();
		await wrapper.trigger('click');

		expect(wrapper.emitted('click')).toHaveLength(1);
	});

	describe('badge', () => {
		it('shows no badge by default or for a zero count', () => {
			expect(mountButton().find('.ui-badge').exists()).toBe(false);
			expect(mountButton({ badge: 0 }).find('.ui-badge').exists()).toBe(false);
		});

		it('shows a dot for true and a count for a number', () => {
			expect(mountButton({ badge: true }).get('.ui-badge__indicator').classes()).toContain('ui-badge__indicator--dot');
			expect(mountButton({ badge: 3 }).get('.ui-badge__indicator').text()).toBe('3');
		});

		it('spells the badge into the accessible name, since aria-label overrides the content', () => {
			expect(mountButton({ badge: 3 }).attributes('aria-label')).toBe('Open menu, 3');
			expect(mountButton({ badge: true, badgeLabel: 'email not verified' }).attributes('aria-label')).toBe(
				'Open menu, email not verified',
			);
			// The tooltip stays the plain label.
			expect(mountButton({ badge: 3 }).attributes('title')).toBe('Open menu');
		});
	});

	it('passes trigger attributes through to the rendered element', () => {
		// The UiMenu contract: `v-bind="triggerProps"` must land aria-expanded etc. on the button.
		const wrapper = mount(UiIconButton, {
			props: { icon: 'more_vert', label: 'Actions' },
			attrs: { 'aria-expanded': 'false', 'aria-haspopup': 'menu', id: 'trigger' },
		});

		expect(wrapper.attributes('aria-expanded')).toBe('false');
		expect(wrapper.attributes('aria-haspopup')).toBe('menu');
		expect(wrapper.attributes('id')).toBe('trigger');
	});

	it('lands variant and size as modifier classes', () => {
		const wrapper = mountButton({ variant: 'secondary', size: 'sm' });

		expect(wrapper.classes()).toContain('ui-icon-button--secondary');
		expect(wrapper.classes()).toContain('ui-icon-button--size-sm');
		expect(mountButton().classes()).toContain('ui-icon-button--ghost');
	});
});
