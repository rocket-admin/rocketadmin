// Port of frontend/src/app/services/master-password.service.ts: the per-connection master key for
// client-side encrypted connections. The key lives in localStorage as `<connectionId>__masterKey`;
// the API client sends it as the `masterpwd` header.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { connectionIdFromPath } from '@/api/client';
import MasterPasswordDialog from '@/components/master-password/MasterPasswordDialog.vue';
import { type DialogRef, useDialog } from '@/composables/useDialog';

export function masterKeyStorageKey(connectionId: string): string {
	return `${connectionId}__masterKey`;
}

export interface MasterPasswordDialogData {
	connectionId: string | null;
}

export const useMasterPasswordStore = defineStore('masterPassword', () => {
	/**
	 * Bumped after a new master password is entered. Angular re-created the current route's
	 * components (`shouldReuseRoute = () => false`); the shell keys its `<RouterView>` on this so the
	 * page remounts and refetches with the new key.
	 */
	const pageReloadKey = ref(0);

	/**
	 * Asks for the master password of `connectionId` (by default the one in the URL, as the client's
	 * own fallback does). Only Cancel closes it: Escape and the backdrop are disabled (`disableClose`).
	 */
	function showMasterPasswordDialog(connectionId: string | null = connectionIdFromPath(location.pathname)): DialogRef {
		return useDialog().open<void, MasterPasswordDialogData>(MasterPasswordDialog, { data: { connectionId } });
	}

	/** Called with a connection's settings: keep the given key when encryption is on, forget it when off. */
	function checkMasterPassword(isEncryptionEnabled: boolean, connectionID: string, masterKey: string): void {
		if (isEncryptionEnabled) localStorage.setItem(masterKeyStorageKey(connectionID), masterKey);
		else localStorage.removeItem(masterKeyStorageKey(connectionID));
	}

	function saveMasterPassword(connectionId: string | null, password: string): void {
		localStorage.setItem(masterKeyStorageKey(String(connectionId)), password);
		pageReloadKey.value++;
	}

	return { pageReloadKey, showMasterPasswordDialog, checkMasterPassword, saveMasterPassword };
});
