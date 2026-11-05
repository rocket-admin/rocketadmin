import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { useDialog, useDialogRef } from '@/composables/useDialog';
import AppDialogForm from './AppDialogForm.vue';
import DialogHost from './DialogHost.vue';

const RenameDialog = defineComponent({
	props: { data: { type: Object as () => { name: string }, required: true } },
	setup(props) {
		const dialogRef = useDialogRef<string>();
		return () =>
			h(
				AppDialogForm,
				{ title: 'Rename', submitLabel: 'Rename', onSubmit: () => dialogRef.close(`${props.data.name}!`) },
				() => h('p', { class: 'body' }, props.data.name),
			);
	},
});

function mountHost() {
	return mount(DialogHost, { attachTo: document.body });
}

function button(wrapper: ReturnType<typeof mountHost>, label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`no button ${label}`);
	return match;
}

describe('useDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('renders the dialog with its data and resolves afterClosed with the result', async () => {
		const wrapper = mountHost();
		const dialogRef = useDialog().open<string>(RenameDialog, { data: { name: 'users' } });
		await flushPromises();

		expect(wrapper.find('.body').text()).toBe('users');
		await wrapper.find('form').trigger('submit');

		await expect(dialogRef.afterClosed()).resolves.toBe('users!');
		await flushPromises();
		expect(wrapper.find('form').exists()).toBe(false);
		wrapper.unmount();
	});

	it('resolves undefined when cancelled', async () => {
		const wrapper = mountHost();
		const dialogRef = useDialog().open(RenameDialog, { data: { name: 'users' } });
		await flushPromises();

		await button(wrapper, 'Cancel').trigger('click');

		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		wrapper.unmount();
	});

	it('uses a submit-type primary button inside the form', async () => {
		const wrapper = mountHost();
		useDialog().open(RenameDialog, { data: { name: 'x' } });
		await flushPromises();

		const submit = button(wrapper, 'Rename');
		expect(submit.attributes('type')).toBe('submit');
		expect(submit.element.closest('form')).not.toBeNull();
		wrapper.unmount();
	});

	it('closes every dialog with closeAll', async () => {
		const wrapper = mountHost();
		const dialog = useDialog();
		const first = dialog.open(RenameDialog, { data: { name: 'a' } });
		const second = dialog.open(RenameDialog, { data: { name: 'b' } });
		await flushPromises();
		expect(wrapper.findAll('form')).toHaveLength(2);

		dialog.closeAll();

		await expect(Promise.all([first.afterClosed(), second.afterClosed()])).resolves.toEqual([undefined, undefined]);
		wrapper.unmount();
	});
});

describe('AppDialogForm inline', () => {
	it('emits submit only while not busy', async () => {
		const wrapper = mount(AppDialogForm, { props: { title: 'Add', open: true, busy: true }, attachTo: document.body });
		await wrapper.find('form').trigger('submit');
		expect(wrapper.emitted('submit')).toBeUndefined();

		await wrapper.setProps({ busy: false });
		await wrapper.find('form').trigger('submit');
		expect(wrapper.emitted('submit')).toHaveLength(1);
		wrapper.unmount();
	});

	it('emits update:open false on cancel', async () => {
		const wrapper = mount(AppDialogForm, { props: { title: 'Add', open: true }, attachTo: document.body });
		const cancel = wrapper.findAll('button').find((candidate) => candidate.text() === 'Cancel');
		await cancel?.trigger('click');
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
		wrapper.unmount();
	});
});
