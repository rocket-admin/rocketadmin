import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router';
import UiButton from './UiButton.vue';

/**
 * Behaviour and contracts only — never CSS values. The assertions about `variant` and `size` check
 * that the modifier class is *present*, not what it paints; Storybook's `AllVariants` matrix and a
 * reviewer's eyes cover appearance, and a padding assertion here would just make the design system
 * harder to evolve.
 */

function routerPlugin() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/', component: { template: '<div />' } }],
	});
}

function mountButton(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
	return mount(UiButton, {
		props,
		slots: { default: 'Go', ...slots },
		global: { plugins: [routerPlugin()] },
	});
}

describe('UiButton', () => {
	describe('rendered element', () => {
		it('is a <button type="button"> by default', () => {
			const wrapper = mountButton();

			expect(wrapper.element.tagName).toBe('BUTTON');
			expect(wrapper.attributes('type')).toBe('button');
		});

		it('honours an explicit type, so it can submit a form', () => {
			expect(mountButton({ type: 'submit' }).attributes('type')).toBe('submit');
		});

		it('is an <a href> when given href', () => {
			const wrapper = mountButton({ href: 'https://example.com' });

			expect(wrapper.element.tagName).toBe('A');
			expect(wrapper.attributes('href')).toBe('https://example.com');
			// A link has no `type`; leaking one through would be invalid HTML.
			expect(wrapper.attributes('type')).toBeUndefined();
		});

		it('is a RouterLink when given to', () => {
			const wrapper = mountButton({ to: '/' });

			expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
			expect(wrapper.find('a').attributes('href')).toBe('/');
		});
	});

	describe('disabled', () => {
		it('sets the native disabled attribute on a button', () => {
			expect(mountButton({ disabled: true }).attributes('disabled')).toBeDefined();
		});

		it('strips href and marks aria-disabled on a link', () => {
			// The important half is the *absence* of href: `pointer-events: none` would still leave the
			// link tabbable and openable in a new tab.
			const wrapper = mountButton({ href: 'https://example.com', disabled: true });

			expect(wrapper.attributes('href')).toBeUndefined();
			expect(wrapper.attributes('aria-disabled')).toBe('true');
			expect(wrapper.attributes('role')).toBe('link');
		});

		it('does not navigate a disabled RouterLink', () => {
			const wrapper = mountButton({ to: '/somewhere', disabled: true });

			expect(wrapper.findComponent(RouterLink).exists()).toBe(false);
			expect(wrapper.attributes('aria-disabled')).toBe('true');
		});
	});

	describe('loading', () => {
		it('sets aria-busy, disables, and mounts a spinner', () => {
			const wrapper = mountButton({ loading: true });

			expect(wrapper.attributes('aria-busy')).toBe('true');
			expect(wrapper.attributes('disabled')).toBeDefined();
			expect(wrapper.find('.ui-spinner').exists()).toBe(true);
		});

		it('replaces the leading slot rather than rendering both', () => {
			const wrapper = mountButton({ loading: true }, { leading: '<span class="icon" />' });

			expect(wrapper.find('.icon').exists()).toBe(false);
			expect(wrapper.find('.ui-spinner').exists()).toBe(true);
		});

		it('leaves the spinner out of the accessibility tree', () => {
			// The button already announces via aria-busy; a second "Loading" would be noise.
			const wrapper = mountButton({ loading: true });

			expect(wrapper.find('.ui-spinner').attributes('aria-hidden')).toBe('true');
		});

		it('is not busy when idle', () => {
			expect(mountButton().attributes('aria-busy')).toBeUndefined();
		});
	});

	describe('click', () => {
		it('emits when enabled', async () => {
			const wrapper = mountButton();
			await wrapper.trigger('click');

			expect(wrapper.emitted('click')).toHaveLength(1);
		});

		it('does not act when loading', () => {
			// The native `disabled` attribute is what stops it; assert the state that produces it, since
			// jsdom still dispatches on a disabled element.
			const wrapper = mountButton({ loading: true });

			expect(wrapper.attributes('disabled')).toBeDefined();
		});

		it('suppresses the default action on a disabled link', async () => {
			const wrapper = mountButton({ href: 'https://example.com', disabled: true });
			await wrapper.trigger('click');

			// No href to follow, and the handler stops propagation so an ancestor listener can't fire.
			expect(wrapper.attributes('href')).toBeUndefined();
		});
	});

	describe('modifier classes', () => {
		it('lands variant and size as classes', () => {
			const wrapper = mountButton({ variant: 'danger', size: 'lg' });

			expect(wrapper.classes()).toContain('ui-button--danger');
			expect(wrapper.classes()).toContain('ui-button--size-lg');
		});

		it('defaults to primary md', () => {
			const wrapper = mountButton();

			expect(wrapper.classes()).toContain('ui-button--primary');
			expect(wrapper.classes()).toContain('ui-button--size-md');
		});

		it('adds the block modifier only when asked', () => {
			expect(mountButton().classes()).not.toContain('ui-button--block');
			expect(mountButton({ block: true }).classes()).toContain('ui-button--block');
		});

		it('keeps a caller class alongside its own', () => {
			// The documented layout-only passthrough: callers need one-off margins.
			const wrapper = mountButton({ class: 'mt-4' });

			expect(wrapper.classes()).toContain('mt-4');
			expect(wrapper.classes()).toContain('ui-button');
		});
	});

	describe('slots', () => {
		it('renders default, leading and trailing content', () => {
			const wrapper = mountButton(
				{},
				{ leading: '<span class="lead">L</span>', trailing: '<span class="trail">T</span>' },
			);

			expect(wrapper.text()).toContain('Go');
			expect(wrapper.find('.lead').exists()).toBe(true);
			expect(wrapper.find('.trail').exists()).toBe(true);
		});

		it('omits adornment wrappers when the slots are unused', () => {
			expect(mountButton().findAll('.ui-button__adornment')).toHaveLength(0);
		});
	});
});
