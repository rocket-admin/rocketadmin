// Spec helpers for the account-pages dialogs (not shipped: only *.spec.ts files import this).
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Component } from 'vue';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { type DialogRef, useDialog } from '@/composables/useDialog';

/** Opens `dialog` through useDialog() under a mounted DialogHost, with a fresh Pinia. */
export async function openDialog<R>(
	dialog: Component,
	data?: unknown,
): Promise<{ wrapper: VueWrapper; dialogRef: DialogRef<R> }> {
	setActivePinia(createPinia());
	const wrapper = mount(DialogHost, { attachTo: document.body });
	const dialogRef = useDialog().open<R>(dialog, { data });
	await flushPromises();
	return { wrapper, dialogRef };
}

/** The button whose text is `label`. */
export function buttonByText(wrapper: VueWrapper, label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No button "${label}"`);
	return match;
}

/** Whether a dialog is still rendered. */
export function isOpen(wrapper: VueWrapper): boolean {
	return wrapper.find('dialog').exists();
}
