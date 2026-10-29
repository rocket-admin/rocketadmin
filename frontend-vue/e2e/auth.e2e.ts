import { ADMIN_EMAIL, ADMIN_PASSWORD } from './support/fixtures';
import { expect, notification, test } from './support/test';

async function enterCredentials(page: import('@playwright/test').Page, email: string, password: string) {
	await page.getByRole('textbox', { name: 'Email' }).fill(email);
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('textbox', { name: 'Password' }).fill(password);
	await page.getByTestId('login-button').click();
}

test.describe('authentication', () => {
	test('a signed-out visitor is sent to the login page', async ({ page }) => {
		await page.goto('/connections-list');
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole('heading', { name: 'Welcome back to Rocketadmin' })).toBeVisible();
	});

	test('logs in with email and password', async ({ page, backend }) => {
		await page.goto('/login');
		await enterCredentials(page, ADMIN_EMAIL, ADMIN_PASSWORD);

		await expect(page).toHaveURL(/\/connections-list$/);
		await expect(page.getByRole('link', { name: /Shop DB/ })).toBeVisible();
		expect(backend.callsTo('POST', '/user/login')[0].body).toMatchObject({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
			companyId: 'company-1',
		});
	});

	test('shows the error for a wrong password and stays on the login page', async ({ page }) => {
		await page.goto('/login');
		await enterCredentials(page, ADMIN_EMAIL, 'wrong-password');

		await expect(notification(page, 'Invalid email or password')).toBeVisible();
		await expect(page).toHaveURL(/\/login$/);
	});

	test('asks for the 2FA code when the account has it enabled', async ({ page, backend }) => {
		backend.state.user.is_2fa_enabled = true;
		await page.goto('/login');
		await enterCredentials(page, ADMIN_EMAIL, ADMIN_PASSWORD);

		const code = page.getByRole('textbox', { name: /code/i });
		await expect(code).toBeVisible();
		await code.fill('123456');
		await page.getByRole('button', { name: /Verify|Log in|Login/ }).click();

		await expect(page).toHaveURL(/\/connections-list$/);
	});

	test('logs out from the account menu', async ({ page, signIn, backend }) => {
		await signIn();
		await page.goto('/connections-list');
		await page.getByRole('button', { name: ADMIN_EMAIL }).click();
		await page.getByRole('menuitem', { name: /Log ?out/i }).click();

		await expect(page).toHaveURL(/\/login$/);
		expect(backend.callsTo('POST', '/user/logout')).toHaveLength(1);
		expect(await page.evaluate(() => localStorage.getItem('token_expiration'))).toBeNull();
	});

	test('a signed-in user opening /login goes to the connections list', async ({ page, signIn }) => {
		await signIn();
		await page.goto('/login');
		await expect(page).toHaveURL(/\/connections-list$/);
	});

	test('requests a password reset email', async ({ page, backend }) => {
		await page.goto('/login');
		await page.getByRole('link', { name: 'Reset password' }).click();
		await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();

		await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
		await page.getByRole('button', { name: 'Next' }).click();
		await page.getByRole('button', { name: 'Reset my password' }).click();

		await expect(notification(page, 'Check your email.')).toBeVisible();
		expect(backend.callsTo('POST', '/user/password/reset/request')[0].body).toEqual({
			email: ADMIN_EMAIL,
			companyId: 'company-1',
		});
	});

	test('sets a new password from the emailed reset link', async ({ page, backend }) => {
		await page.goto('/external/user/password/reset/verify/reset-token');
		await page
			.getByRole('textbox', { name: /new password/i })
			.first()
			.fill('Brand-new-Passw0rd!');
		await page.getByRole('button', { name: /Reset|Save|Change/ }).click();

		await expect.poll(() => backend.state.password).toBe('Brand-new-Passw0rd!');
	});

	test('changes the password of the signed-in user', async ({ page, signIn, backend }) => {
		await signIn();
		await page.goto('/change-password');
		await page.getByRole('textbox', { name: /old password/i }).fill(ADMIN_PASSWORD);
		await page.getByRole('textbox', { name: /new password/i }).fill('Brand-new-Passw0rd!');
		await page.getByRole('button', { name: 'Change' }).click();

		await expect.poll(() => backend.state.password).toBe('Brand-new-Passw0rd!');
	});

	test('self-hosted: the first visit creates the admin account', async ({ page, backend }) => {
		backend.state.configured = false;
		await page.goto('/login');
		await expect(page).toHaveURL(/\/setup$/);

		await page.getByRole('textbox', { name: 'Email' }).fill('owner@example.com');
		await page.getByRole('textbox', { name: 'Password' }).fill('Very-strong-Passw0rd!');
		await page.getByRole('button', { name: 'Create Admin Account' }).click();

		await expect.poll(() => backend.state.configured).toBe(true);
		expect(backend.callsTo('POST', '/selfhosted/initial-user')[0].body).toMatchObject({ email: 'owner@example.com' });
	});

	test('an unknown URL shows the not-found page', async ({ page }) => {
		await page.goto('/this/page/does/not/exist');
		await expect(page.getByRole('heading', { name: "We can't find the page you are looking for" })).toBeVisible();
	});
});
