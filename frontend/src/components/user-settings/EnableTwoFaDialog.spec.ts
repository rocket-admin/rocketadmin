import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonByText, openDialog } from './dialogTestUtils';
import EnableTwoFaDialog, { type EnableTwoFaResult } from './EnableTwoFaDialog.vue';

const store = vi.hoisted(() => ({ confirm2FA: vi.fn() }));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/user', () => ({ useUserStore: () => store }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));

let wrapper: VueWrapper;
const QR = 'data:image/png;base64,iVBORw0KGgo=';

async function mountDialog() {
	const opened = await openDialog<EnableTwoFaResult>(EnableTwoFaDialog, QR);
	wrapper = opened.wrapper;
	return opened.dialogRef;
}

describe('EnableTwoFaDialog', () => {
	beforeEach(() => vi.clearAllMocks());
	afterEach(() => wrapper.unmount());

	it('shows the QR code and requires the code', async () => {
		await mountDialog();
		expect(wrapper.find('img').attributes('src')).toBe(QR);
		expect(buttonByText(wrapper, 'Enable').attributes('disabled')).toBeDefined();
	});

	it('verifies the code and closes with "enable"', async () => {
		store.confirm2FA.mockResolvedValue({ validated: true });
		const dialogRef = await mountDialog();
		await wrapper.find('input[name="code"]').setValue('123456');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(store.confirm2FA).toHaveBeenCalledWith('123456');
		expect(trackAuthEvent).toHaveBeenCalledWith('User settings: 2fa enabled successfully');
		await expect(dialogRef.afterClosed()).resolves.toBe('enable');
	});

	it('closes with "error" when the code is rejected', async () => {
		store.confirm2FA.mockRejectedValue(new Error('invalid'));
		const dialogRef = await mountDialog();
		await wrapper.find('input[name="code"]').setValue('000000');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		await expect(dialogRef.afterClosed()).resolves.toBe('error');
	});
});
