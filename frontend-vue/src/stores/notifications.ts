// Port of NotificationsService: the page alert (one at a time, rendered by <AppAlert>) and the
// snackbars that replace MatSnackBar (rendered by <AppSnackbars> in the shell).
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Alert, AlertAction, AlertType, ServerError } from '@/models/alert';

export interface Snackbar {
	id: number;
	message: string;
	tone: 'error' | 'success';
	/** Label of the dismiss button; snackbars without one only time out. */
	actionLabel: string | null;
	position: 'top' | 'bottom';
	duration: number;
}

export const ERROR_SNACKBAR_DURATION = 10000;
export const SUCCESS_SNACKBAR_DURATION = 2500;

export const useNotificationsStore = defineStore('notifications', () => {
	const alert = ref<Alert | null>(null);
	const snackbars = ref<Snackbar[]>([]);
	let alertCounter = 0;
	let snackbarCounter = 0;
	const timers = new Map<number, ReturnType<typeof setTimeout>>();

	function showAlert(type: AlertType, message: ServerError | string, actions: AlertAction[] = []): void {
		alertCounter++;
		alert.value = { id: alertCounter, type, message, actions };
	}

	function dismissAlert(): void {
		alert.value = null;
	}

	function pushSnackbar(snackbar: Omit<Snackbar, 'id'>): number {
		const id = ++snackbarCounter;
		// MatSnackBar shows one at a time: a new one replaces the current one.
		for (const existing of snackbars.value) dismissSnackbar(existing.id);
		snackbars.value = [{ ...snackbar, id }];
		timers.set(
			id,
			setTimeout(() => dismissSnackbar(id), snackbar.duration),
		);
		return id;
	}

	function showErrorSnackbar(message: string): number {
		return pushSnackbar({
			message,
			tone: 'error',
			actionLabel: 'Dismiss',
			position: 'bottom',
			duration: ERROR_SNACKBAR_DURATION,
		});
	}

	function showSuccessSnackbar(message: string, position: 'top' | 'bottom' = 'bottom'): number {
		return pushSnackbar({ message, tone: 'success', actionLabel: null, position, duration: SUCCESS_SNACKBAR_DURATION });
	}

	function dismissSnackbar(id: number): void {
		clearTimeout(timers.get(id));
		timers.delete(id);
		snackbars.value = snackbars.value.filter((snackbar) => snackbar.id !== id);
	}

	return {
		alert,
		snackbars,
		showAlert,
		dismissAlert,
		/** Alias kept from the Angular service, where both names existed. */
		resetAlert: dismissAlert,
		showErrorSnackbar,
		showSuccessSnackbar,
		dismissSnackbar,
	};
});
