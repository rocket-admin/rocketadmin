import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import MasterPasswordDialog from '@/components/master-password/MasterPasswordDialog.vue';
import { useDialogsStore } from '@/composables/useDialog';
import { masterKeyStorageKey, useMasterPasswordStore } from './master-password';

describe('master-password store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
	});

	it('opens the master password dialog for the given connection', () => {
		useMasterPasswordStore().showMasterPasswordDialog('conn-1');

		const [entry] = useDialogsStore().entries;
		expect(entry?.component).toBe(MasterPasswordDialog);
		expect(entry?.data).toEqual({ connectionId: 'conn-1' });
	});

	it('defaults to the connection in the URL', () => {
		history.replaceState(null, '', '/dashboard/conn-from-url/users');

		useMasterPasswordStore().showMasterPasswordDialog();

		expect(useDialogsStore().entries[0]?.data).toEqual({ connectionId: 'conn-from-url' });
		history.replaceState(null, '', '/');
	});

	it('stores the master key when encryption is on', () => {
		useMasterPasswordStore().checkMasterPassword(true, '12345678', 'abcd-0987654321');
		expect(localStorage.getItem('12345678__masterKey')).toBe('abcd-0987654321');
	});

	it('removes the master key when encryption is off', () => {
		localStorage.setItem('12345678__masterKey', 'old');
		useMasterPasswordStore().checkMasterPassword(false, '12345678', 'abcd-0987654321');
		expect(localStorage.getItem('12345678__masterKey')).toBeNull();
	});

	it('saves an entered password and asks the page to reload', () => {
		const store = useMasterPasswordStore();
		store.saveMasterPassword('conn-1', 'secret');

		expect(localStorage.getItem(masterKeyStorageKey('conn-1'))).toBe('secret');
		expect(store.pageReloadKey).toBe(1);
	});
});
