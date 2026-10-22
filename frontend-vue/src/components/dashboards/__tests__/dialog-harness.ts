// Spec helper for the charts/dashboards dialogs: mounts the DialogHost and opens `component` in it
// with `data`, the way the pages do through useDialog().open(). Activate Pinia before calling.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { Component, Plugin } from 'vue';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { type DialogRef, useDialog } from '@/composables/useDialog';

export async function openDialog<R = unknown>(
	component: Component,
	data: unknown,
	plugins: Plugin[] = [],
): Promise<{ wrapper: VueWrapper; dialogRef: DialogRef<R> }> {
	const wrapper = mount(DialogHost, { attachTo: document.body, global: { plugins } });
	const dialogRef = useDialog().open<R>(component, { data });
	await flushPromises();
	return { wrapper, dialogRef };
}

/** The button whose text is `label`. */
export function buttonByText(wrapper: VueWrapper, label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`No button "${label}"`);
	return match;
}
