// Replaces MatSnackBar at call sites: `const notify = useNotify(); notify.success('Saved.')`.
import { useNotificationsStore } from '@/stores/notifications';

export function useNotify() {
	const notifications = useNotificationsStore();
	return {
		success: (message: string, position?: 'top' | 'bottom') => notifications.showSuccessSnackbar(message, position),
		error: (message: string) => notifications.showErrorSnackbar(message),
		dismiss: (id: number) => notifications.dismissSnackbar(id),
	};
}
