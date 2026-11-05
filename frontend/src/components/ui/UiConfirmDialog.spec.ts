import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UiConfirmDialog from './UiConfirmDialog.vue';

// See UiModal.spec.ts: jsdom 29 implements neither showModal() nor close(), so both are installed.
beforeEach(() => {
	const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
	proto.showModal = vi.fn(function (this: HTMLDialogElement) {
		this.open = true;
	});
	proto.close = vi.fn(function (this: HTMLDialogElement) {
		this.open = false;
	});
});

afterEach(() => {
	const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
	delete proto.showModal;
	delete proto.close;
});

function mountDialog(props: Record<string, unknown> = {}) {
	return mount(UiConfirmDialog, {
		props: {
			open: true,
			title: 'Delete "My site"?',
			message: "This can't be undone.",
			...props,
		},
		attachTo: document.body,
	});
}

describe('UiConfirmDialog', () => {
	it('renders the question as the dialog name and the consequence as body copy', () => {
		const wrapper = mountDialog();
		const labelledBy = wrapper.get('dialog').attributes('aria-labelledby');

		expect(wrapper.get(`#${labelledBy}`).text()).toBe('Delete "My site"?');
		expect(wrapper.text()).toContain("This can't be undone.");
	});

	it('emits confirm when the confirm button is pressed', async () => {
		const wrapper = mountDialog({ confirmLabel: 'Delete' });
		const confirm = wrapper.findAll('button').find((b) => b.text() === 'Delete');

		await confirm?.trigger('click');

		expect(wrapper.emitted('confirm')).toHaveLength(1);
	});

	it('emits cancel and closes when the cancel button is pressed', async () => {
		const wrapper = mountDialog();
		const cancel = wrapper.findAll('button').find((b) => b.text() === 'Cancel');

		await cancel?.trigger('click');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
		expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
	});

	it('maps the danger tone onto the button variant vocabulary', () => {
		// `tone` is status vocabulary and `variant` is interaction emphasis; CONVENTIONS.md forbids a
		// component carrying both, so the mapping happens here rather than leaking either way.
		const danger = mountDialog({ confirmLabel: 'Delete' });
		const confirm = danger.findAll('button').find((b) => b.text() === 'Delete');
		expect(confirm?.classes()).toContain('ui-button--danger');

		const accent = mountDialog({ tone: 'accent', confirmLabel: 'Publish' });
		const publish = accent.findAll('button').find((b) => b.text() === 'Publish');
		expect(publish?.classes()).toContain('ui-button--primary');
	});

	it('shows the confirm button busy and blocks cancelling while a request is in flight', async () => {
		const wrapper = mountDialog({ busy: true, confirmLabel: 'Delete' });
		const confirm = wrapper.findAll('button').find((b) => b.text() === 'Delete');

		expect(confirm?.attributes('aria-busy')).toBe('true');

		// Cancel must not fire mid-request: the dialog describes an operation still running.
		const cancel = wrapper.findAll('button').find((b) => b.text() === 'Cancel');
		await cancel?.trigger('click');
		expect(wrapper.emitted('cancel')).toBeUndefined();
	});

	it('refuses Escape while busy', async () => {
		const wrapper = mountDialog({ busy: true });

		await wrapper.get('dialog').trigger('cancel');

		expect(wrapper.emitted('update:open')).toBeUndefined();
	});

	it('defaults to a destructive confirm labelled Confirm', () => {
		const wrapper = mountDialog();
		const labels = wrapper.findAll('button').map((b) => b.text());

		expect(labels).toContain('Confirm');
		expect(labels).toContain('Cancel');
	});
});
