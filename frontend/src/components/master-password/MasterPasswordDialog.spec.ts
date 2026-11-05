import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import DialogHost from '@/components/dialog/DialogHost.vue';
import { useMasterPasswordStore } from '@/stores/master-password';

function mountHost() {
	return mount(DialogHost, { attachTo: document.body });
}

function button(wrapper: ReturnType<typeof mountHost>, label: string) {
	const match = wrapper.findAll('button').find((candidate) => candidate.text() === label);
	if (!match) throw new Error(`no button ${label}`);
	return match;
}

describe('MasterPasswordDialog', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
	});

	it('renders a required password field inside a form with a submit button', async () => {
		const wrapper = mountHost();
		useMasterPasswordStore().showMasterPasswordDialog('conn-1');
		await flushPromises();

		expect(wrapper.find('h2').text()).toBe('Enter Master Password');
		const input = wrapper.find('input');
		expect(input.attributes('type')).toBe('password');
		expect(input.attributes('required')).toBeDefined();
		expect(button(wrapper, 'Submit').attributes('type')).toBe('submit');
		wrapper.unmount();
	});

	it('stores the password for the connection, asks for a page reload and closes', async () => {
		const wrapper = mountHost();
		const store = useMasterPasswordStore();
		const dialogRef = store.showMasterPasswordDialog('conn-1');
		await flushPromises();

		await wrapper.find('input').setValue('s3cret');
		await wrapper.find('form').trigger('submit');

		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(localStorage.getItem('conn-1__masterKey')).toBe('s3cret');
		expect(store.pageReloadKey).toBe(1);
		await flushPromises();
		expect(wrapper.find('form').exists()).toBe(false);
		wrapper.unmount();
	});

	it('is not dismissible: Escape does nothing and there is no close button', async () => {
		const wrapper = mountHost();
		useMasterPasswordStore().showMasterPasswordDialog('conn-1');
		await flushPromises();

		await wrapper.find('dialog').trigger('cancel');
		await flushPromises();

		expect(wrapper.find('form').exists()).toBe(true);
		expect(wrapper.find('[aria-label="Close dialog"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('closes on Cancel without storing anything', async () => {
		const wrapper = mountHost();
		const dialogRef = useMasterPasswordStore().showMasterPasswordDialog('conn-1');
		await flushPromises();

		await wrapper.find('input').setValue('typed');
		await button(wrapper, 'Cancel').trigger('click');

		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
		expect(localStorage.getItem('conn-1__masterKey')).toBeNull();
		wrapper.unmount();
	});
});
