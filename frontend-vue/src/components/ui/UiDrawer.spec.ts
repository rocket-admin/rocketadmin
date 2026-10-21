import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import UiDrawer from './UiDrawer.vue';

/**
 * jsdom 29 has `HTMLDialogElement` but neither `showModal()` nor `close()` (see UiModal.spec.ts), so
 * both are installed here and keep `open` truthful, since that's what the component reads.
 */
function installDialogStubs() {
	const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
	const showModal = vi.fn(function (this: HTMLDialogElement) {
		this.open = true;
	});
	const close = vi.fn(function (this: HTMLDialogElement) {
		this.open = false;
	});
	proto.showModal = showModal;
	proto.close = close;
	return { showModal, close };
}

let stubs: ReturnType<typeof installDialogStubs>;

beforeEach(() => {
	stubs = installDialogStubs();
});

afterEach(() => {
	const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
	delete proto.showModal;
	delete proto.close;
	document.body.innerHTML = '';
});

function mountDrawer(props: Record<string, unknown> = {}) {
	return mount(UiDrawer, {
		props: { open: true, label: 'Main navigation', ...props },
		slots: { default: '<a href="/connections">Connections</a>' },
		attachTo: document.body,
	});
}

describe('UiDrawer', () => {
	it('opens as a modal dialog named by its label', async () => {
		const wrapper = mountDrawer();
		await nextTick();
		await nextTick();

		expect(stubs.showModal).toHaveBeenCalled();
		expect(wrapper.get('dialog').attributes('aria-label')).toBe('Main navigation');
	});

	it('does not open until `open` turns true, and closes when it turns false', async () => {
		const wrapper = mountDrawer({ open: false });
		await nextTick();
		expect(stubs.showModal).not.toHaveBeenCalled();

		await wrapper.setProps({ open: true });
		await nextTick();
		expect(stubs.showModal).toHaveBeenCalled();

		await wrapper.setProps({ open: false });
		await nextTick();
		expect(stubs.close).toHaveBeenCalled();
	});

	it('moves focus inside on open and returns it to the opener on close', async () => {
		const Host = defineComponent({
			components: { UiDrawer },
			setup: () => ({ open: ref(false) }),
			template: `
        <div>
          <button type="button" class="opener" @click="open = true">Menu</button>
          <UiDrawer v-model:open="open" label="Main navigation">
            <a href="/connections" class="first">Connections</a>
          </UiDrawer>
        </div>
      `,
		});
		const wrapper = mount(Host, { attachTo: document.body });
		const opener = wrapper.get('.opener').element as HTMLButtonElement;
		opener.focus();

		await wrapper.get('.opener').trigger('click');
		await nextTick();
		await nextTick();
		expect(document.activeElement).toBe(wrapper.get('.first').element);

		await wrapper.get('dialog').trigger('cancel');
		await nextTick();
		await nextTick();
		expect(document.activeElement).toBe(opener);
	});

	it('focuses the panel when it holds nothing focusable', async () => {
		const wrapper = mount(UiDrawer, {
			props: { open: true, label: 'Empty' },
			slots: { default: '<p>Nothing to focus</p>' },
			attachTo: document.body,
		});
		await nextTick();
		await nextTick();

		expect(document.activeElement).toBe(wrapper.get('.ui-drawer__panel').element);
	});

	it('requests close on Escape, which arrives as the native cancel event', () => {
		const wrapper = mountDrawer();
		const event = new Event('cancel', { cancelable: true });

		wrapper.get('dialog').element.dispatchEvent(event);

		// Prevented, so the prop rather than the browser decides when it closes.
		expect(event.defaultPrevented).toBe(true);
		expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
		expect(wrapper.emitted('close')).toHaveLength(1);
	});

	it('closes on a backdrop click but not on a click inside the panel', async () => {
		const wrapper = mountDrawer();

		await wrapper.get('.ui-drawer__panel').trigger('click');
		expect(wrapper.emitted('update:open')).toBeUndefined();

		await wrapper.get('dialog').trigger('click');
		expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
	});

	it('renders header and footer slots only when given', () => {
		expect(mountDrawer().find('.ui-drawer__header').exists()).toBe(false);
		const wrapper = mount(UiDrawer, {
			props: { open: false, label: 'Nav' },
			slots: { header: 'Rocketadmin', footer: 'v1.0' },
		});

		expect(wrapper.get('.ui-drawer__header').text()).toBe('Rocketadmin');
		expect(wrapper.get('.ui-drawer__footer').text()).toBe('v1.0');
	});

	it('forwards class to the dialog and lands size as a modifier', () => {
		const wrapper = mount(UiDrawer, {
			props: { open: false, label: 'Nav', size: 'lg' },
			attrs: { class: 'shell-drawer' },
		});

		expect(wrapper.get('dialog').classes()).toEqual(expect.arrayContaining(['shell-drawer', 'ui-drawer--size-lg']));
	});

	it('closes an open dialog when unmounted, so the page does not stay inert', async () => {
		const wrapper = mountDrawer();
		await nextTick();
		await nextTick();
		stubs.close.mockClear();

		wrapper.unmount();

		expect(stubs.close).toHaveBeenCalled();
	});
});
