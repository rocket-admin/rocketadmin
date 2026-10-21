import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import UiIconButton from './UiIconButton.vue';
import UiMenu from './UiMenu.vue';
import UiMenuItem from './UiMenuItem.vue';

/**
 * jsdom has no popover API and no layout, so these assert the ARIA wiring, the keyboard contract,
 * focus movement and `v-show` visibility — the parts the component owns. Positioning is eyes-only.
 */

const onDelete = vi.fn();

function mountMenu(menuProps: Record<string, unknown> = {}) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', component: { template: '<div />' } },
			{ path: '/company', component: { template: '<div />' } },
		],
	});
	const Host = defineComponent({
		components: { UiMenu, UiMenuItem, UiIconButton },
		setup: () => ({ menuProps, onDelete, open: ref(false) }),
		template: `
      <div>
        <UiMenu v-bind="menuProps" v-model:open="open">
          <template #trigger="{ triggerProps }">
            <UiIconButton icon="more_vert" label="Actions" v-bind="triggerProps" />
          </template>
          <UiMenuItem to="/company" icon="apartment">Company</UiMenuItem>
          <UiMenuItem href="https://docs.rocketadmin.com/" target="_blank">Help center</UiMenuItem>
          <UiMenuItem disabled>Archive</UiMenuItem>
          <UiMenuItem variant="danger" @select="onDelete">Delete</UiMenuItem>
        </UiMenu>
        <button type="button" class="outside">Outside</button>
      </div>
    `,
	});
	return mount(Host, { attachTo: document.body, global: { plugins: [router] } });
}

let wrapper: ReturnType<typeof mountMenu> | undefined;

afterEach(() => {
	wrapper?.unmount();
	wrapper = undefined;
	onDelete.mockClear();
});

const trigger = () => wrapper!.get('.ui-icon-button');
const panel = () => wrapper!.get('[role="menu"]');
const items = () => wrapper!.findAll('[role="menuitem"]');
const isOpen = () => (panel().element as HTMLElement).style.display !== 'none';

describe('UiMenu', () => {
	it('wires the trigger to the menu', () => {
		wrapper = mountMenu();

		expect(trigger().attributes('aria-haspopup')).toBe('menu');
		expect(trigger().attributes('aria-expanded')).toBe('false');
		expect(trigger().attributes('aria-controls')).toBe(panel().attributes('id'));
		// Labelled by the trigger unless given its own label.
		expect(panel().attributes('aria-labelledby')).toBe(trigger().attributes('id'));
		expect(isOpen()).toBe(false);
	});

	it('takes its own label when given one', () => {
		wrapper = mountMenu({ label: 'Account menu' });

		expect(panel().attributes('aria-label')).toBe('Account menu');
		expect(panel().attributes('aria-labelledby')).toBeUndefined();
	});

	it('opens on click and focuses the first item', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		expect(isOpen()).toBe(true);
		expect(trigger().attributes('aria-expanded')).toBe('true');
		expect(document.activeElement).toBe(items()[0]?.element);
	});

	it('closes when the trigger is clicked again', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await trigger().trigger('click');

		expect(isOpen()).toBe(false);
	});

	it('opens on ArrowDown at the first item and ArrowUp at the last enabled item', async () => {
		wrapper = mountMenu();
		await trigger().trigger('keydown', { key: 'ArrowDown' });
		await flushPromises();
		expect(document.activeElement).toBe(items()[0]?.element);

		await panel().trigger('keydown', { key: 'Escape' });
		await trigger().trigger('keydown', { key: 'ArrowUp' });
		await flushPromises();
		expect(document.activeElement).toBe(items()[3]?.element);
	});

	it('moves with the arrow keys, wrapping and skipping disabled items', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		await panel().trigger('keydown', { key: 'ArrowDown' });
		expect(document.activeElement).toBe(items()[1]?.element);
		// Archive (index 2) is disabled and skipped.
		await panel().trigger('keydown', { key: 'ArrowDown' });
		expect(document.activeElement).toBe(items()[3]?.element);
		await panel().trigger('keydown', { key: 'ArrowDown' });
		expect(document.activeElement).toBe(items()[0]?.element);
		await panel().trigger('keydown', { key: 'ArrowUp' });
		expect(document.activeElement).toBe(items()[3]?.element);
		await panel().trigger('keydown', { key: 'Home' });
		expect(document.activeElement).toBe(items()[0]?.element);
		await panel().trigger('keydown', { key: 'End' });
		expect(document.activeElement).toBe(items()[3]?.element);
	});

	it('jumps to the next item starting with a typed character', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		await panel().trigger('keydown', { key: 'h' });

		expect(document.activeElement).toBe(items()[1]?.element);
	});

	it('closes on Escape and returns focus to the trigger', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		await panel().trigger('keydown', { key: 'Escape' });

		expect(isOpen()).toBe(false);
		expect(document.activeElement).toBe(trigger().element);
	});

	it('closes on Tab without pulling focus back', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		await panel().trigger('keydown', { key: 'Tab' });

		expect(isOpen()).toBe(false);
	});

	it('closes on a pointerdown outside, but not inside', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		items()[0]?.element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		await flushPromises();
		expect(isOpen()).toBe(true);

		wrapper.get('.outside').element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		await flushPromises();
		expect(isOpen()).toBe(false);
	});

	it('emits select from a button item, then closes and returns focus', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		await items()[3]?.trigger('click');

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(isOpen()).toBe(false);
		expect(document.activeElement).toBe(trigger().element);
	});

	it('does not act on a disabled item', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		await items()[2]?.trigger('click');

		expect(isOpen()).toBe(true);
	});

	it('refuses to open when disabled, and disables the trigger', async () => {
		wrapper = mountMenu({ disabled: true });

		expect(trigger().attributes('disabled')).toBeDefined();
		await trigger().trigger('keydown', { key: 'ArrowDown' });
		await flushPromises();
		expect(isOpen()).toBe(false);
	});

	it('round-trips v-model:open', async () => {
		wrapper = mountMenu();
		await trigger().trigger('click');
		await flushPromises();

		const menu = wrapper.findComponent(UiMenu);
		expect(menu.emitted('update:open')?.[0]).toEqual([true]);

		// The parent's bound ref followed, and closing it from the parent closes the menu.
		const host = wrapper.vm as unknown as { open: boolean };
		expect(host.open).toBe(true);
		host.open = false;
		await flushPromises();
		expect(isOpen()).toBe(false);
	});
});

describe('UiMenuItem', () => {
	it('renders each shape with role="menuitem", out of the tab order', () => {
		wrapper = mountMenu();
		const [link, anchor, disabled, button] = items();

		for (const item of items()) {
			expect(item.attributes('role')).toBe('menuitem');
			expect(item.attributes('tabindex')).toBe('-1');
		}
		expect(link?.element.tagName).toBe('A');
		expect(link?.attributes('href')).toBe('/company');
		expect(anchor?.attributes('href')).toBe('https://docs.rocketadmin.com/');
		expect(anchor?.attributes('target')).toBe('_blank');
		expect(anchor?.attributes('rel')).toBe('noopener noreferrer');
		expect(button?.element.tagName).toBe('BUTTON');
		expect(button?.attributes('type')).toBe('button');
		expect(button?.classes()).toContain('ui-menu-item--danger');
		expect(disabled?.attributes('aria-disabled')).toBe('true');
	});

	it('renders a leading icon and a description line', () => {
		const item = mount(UiMenuItem, {
			props: { icon: 'face', description: 'user@example.com' },
			slots: { default: 'Account' },
		});

		expect(item.get('.ui-icon').text()).toBe('face');
		expect(item.get('.ui-menu-item__label').text()).toBe('Account');
		expect(item.get('.ui-menu-item__description').text()).toBe('user@example.com');
	});

	it('activates a link item on Space, as APG requires of menu items', async () => {
		const item = mount(UiMenuItem, { props: { href: '#somewhere' }, slots: { default: 'Go' } });
		const click = vi.fn();
		item.element.addEventListener('click', click);

		await item.trigger('keydown', { key: ' ' });

		expect(click).toHaveBeenCalled();
	});
});
