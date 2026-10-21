import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UiModal from './UiModal.vue';

/**
 * jsdom 29 ships `HTMLDialogElement` and its `open` property but implements **neither**
 * `showModal()` nor `close()` — they are `undefined`, not merely inert. (The plan assumed jsdom
 * supported `<dialog>` and suggested spying on existing prototype methods; it does not.)
 *
 * So the methods are installed here rather than spied. Each stub also maintains `open`, because
 * that is the state the component reads to decide whether a sync is needed, and a stub that lies
 * about it would make every assertion below meaningless.
 */
function installDialogStubs() {
	const proto = HTMLDialogElement.prototype as unknown as {
		showModal?: () => void;
		close?: () => void;
	};
	const showModal = vi.fn(function (this: HTMLDialogElement) {
		this.open = true;
	});
	const close = vi.fn(function (this: HTMLDialogElement) {
		this.open = false;
		this.dispatchEvent(new Event('close'));
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
});

function mountModal(props: Record<string, unknown> = {}) {
	return mount(UiModal, {
		props: { open: true, title: 'Delete site', ...props },
		slots: { default: 'Body copy' },
		attachTo: document.body,
	});
}

describe('UiModal', () => {
	it('calls showModal() when it mounts open', async () => {
		const wrapper = mountModal();
		await wrapper.vm.$nextTick();

		expect(stubs.showModal).toHaveBeenCalled();
	});

	it('does not open until `open` turns true', async () => {
		const wrapper = mountModal({ open: false });
		await wrapper.vm.$nextTick();
		expect(stubs.showModal).not.toHaveBeenCalled();

		await wrapper.setProps({ open: true });
		await wrapper.vm.$nextTick();

		expect(stubs.showModal).toHaveBeenCalled();
	});

	it('closes the dialog when `open` turns false', async () => {
		const wrapper = mountModal();
		await wrapper.vm.$nextTick();

		await wrapper.setProps({ open: false });
		await wrapper.vm.$nextTick();

		expect(stubs.close).toHaveBeenCalled();
	});

	it('names the dialog via aria-labelledby pointing at the rendered title', () => {
		const wrapper = mountModal({ title: 'Delete "My site"?' });
		const labelledBy = wrapper.get('dialog').attributes('aria-labelledby');

		expect(labelledBy).toBeTruthy();
		expect(wrapper.get(`#${labelledBy}`).text()).toBe('Delete "My site"?');
	});

	it('emits update:open and close when the close button is used', async () => {
		const wrapper = mountModal();

		await wrapper.get('.ui-modal__close').trigger('click');

		expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
		expect(wrapper.emitted('close')).toHaveLength(1);
	});

	it('dismisses on Escape, which arrives as the native cancel event', async () => {
		const wrapper = mountModal();

		await wrapper.get('dialog').trigger('cancel');

		expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
	});

	it('swallows Escape when not dismissible', async () => {
		const wrapper = mountModal({ dismissible: false });

		await wrapper.get('dialog').trigger('cancel');

		// The native default must also be prevented, or the browser closes the dialog regardless of
		// what the component emits — that is the whole mechanism behind `dismissible: false`.
		expect(wrapper.emitted('update:open')).toBeUndefined();
		expect(wrapper.emitted('close')).toBeUndefined();
	});

	it('hides the close button when not dismissible', () => {
		const wrapper = mountModal({ dismissible: false });

		expect(wrapper.find('.ui-modal__close').exists()).toBe(false);
	});

	it('dismisses on a backdrop click but not on a click inside the panel', async () => {
		const wrapper = mountModal();

		// A modal dialog's backdrop is part of its own box, so a backdrop click targets the <dialog>.
		await wrapper.get('dialog').trigger('click');
		expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);

		const inside = mountModal();
		await inside.get('.ui-modal__panel').trigger('click');
		expect(inside.emitted('update:open')).toBeUndefined();
	});

	it('ignores a backdrop click when not dismissible', async () => {
		const wrapper = mountModal({ dismissible: false });

		await wrapper.get('dialog').trigger('click');

		expect(wrapper.emitted('update:open')).toBeUndefined();
	});

	it('renders the footer slot only when given one', () => {
		expect(mountModal().find('.ui-modal__footer').exists()).toBe(false);

		const withFooter = mount(UiModal, {
			props: { open: true, title: 'T' },
			slots: { footer: '<button>OK</button>' },
		});

		expect(withFooter.get('.ui-modal__footer').text()).toBe('OK');
	});

	it('closes an open dialog when unmounted, so the page does not stay inert', async () => {
		const wrapper = mountModal();
		await wrapper.vm.$nextTick();
		stubs.close.mockClear();

		wrapper.unmount();

		expect(stubs.close).toHaveBeenCalled();
	});

	it('lands size as a modifier class', () => {
		expect(mountModal({ size: 'md' }).get('dialog').classes()).toContain('ui-modal--size-md');
		expect(mountModal().get('dialog').classes()).toContain('ui-modal--size-sm');
	});
});
