import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import SecretMasterPasswordDialog from './SecretMasterPasswordDialog.vue';
import { buttonByText, openDialog } from './secretsTestUtils';

let wrapper: VueWrapper;

const input = () => wrapper.find('[data-testid="master-password-input"]');

async function mountDialog() {
	const opened = await openDialog<string>(SecretMasterPasswordDialog);
	wrapper = opened.wrapper;
	return opened.dialogRef;
}

describe('SecretMasterPasswordDialog', () => {
	afterEach(() => wrapper.unmount());

	it('renders the password field with an Unlock submit button', async () => {
		await mountDialog();
		expect(wrapper.find('h2').text()).toBe('Master Password Required');
		expect(input().attributes('type')).toBe('password');
		expect(buttonByText(wrapper, 'Unlock').attributes('type')).toBe('submit');
	});

	it('toggles the password visibility', async () => {
		await mountDialog();
		await wrapper.find('button[aria-label="Show password"]').trigger('click');
		expect(input().attributes('type')).toBe('text');

		await wrapper.find('button[aria-label="Hide password"]').trigger('click');
		expect(input().attributes('type')).toBe('password');
	});

	it('asks for the password when submitted empty', async () => {
		const dialogRef = await mountDialog();
		let closed = false;
		dialogRef.afterClosed().then(() => (closed = true));
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(wrapper.text()).toContain('Please enter the master password');
		expect(closed).toBe(false);
	});

	it('closes with the entered password', async () => {
		const dialogRef = await mountDialog();
		await input().setValue('testpassword');
		await wrapper.find('form').trigger('submit');

		await expect(dialogRef.afterClosed()).resolves.toBe('testpassword');
	});

	it('closes without a result on Cancel', async () => {
		const dialogRef = await mountDialog();
		await buttonByText(wrapper, 'Cancel').trigger('click');
		await expect(dialogRef.afterClosed()).resolves.toBeUndefined();
	});
});
