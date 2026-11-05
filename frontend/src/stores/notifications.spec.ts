import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertType } from '@/models/alert';
import { ERROR_SNACKBAR_DURATION, SUCCESS_SNACKBAR_DURATION, useNotificationsStore } from './notifications';

describe('notifications store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows one alert at a time with increasing ids', () => {
		const notifications = useNotificationsStore();
		notifications.showAlert(AlertType.Error, 'first', []);
		const firstId = notifications.alert?.id ?? 0;
		notifications.showAlert(AlertType.Warning, { abstract: 'second', details: 'more' }, []);

		expect(notifications.alert?.id).toBe(firstId + 1);
		expect(notifications.alert?.message).toEqual({ abstract: 'second', details: 'more' });
		notifications.dismissAlert();
		expect(notifications.alert).toBeNull();
	});

	it('times out error and success snackbars like MatSnackBar did', () => {
		const notifications = useNotificationsStore();

		notifications.showErrorSnackbar('Boom');
		expect(notifications.snackbars[0]).toMatchObject({ tone: 'error', actionLabel: 'Dismiss', position: 'bottom' });
		vi.advanceTimersByTime(ERROR_SNACKBAR_DURATION);
		expect(notifications.snackbars).toEqual([]);

		notifications.showSuccessSnackbar('Saved', 'top');
		expect(notifications.snackbars[0]).toMatchObject({ tone: 'success', actionLabel: null, position: 'top' });
		vi.advanceTimersByTime(SUCCESS_SNACKBAR_DURATION);
		expect(notifications.snackbars).toEqual([]);
	});

	it('replaces the visible snackbar with a new one', () => {
		const notifications = useNotificationsStore();
		notifications.showErrorSnackbar('one');
		notifications.showSuccessSnackbar('two');

		expect(notifications.snackbars.map((snackbar) => snackbar.message)).toEqual(['two']);
	});
});
