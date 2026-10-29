import { ADMIN_EMAIL } from './support/fixtures';
import { expect, notification, test } from './support/test';

test.describe('account settings', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('the account menu leads to the settings pages', async ({ page }) => {
		await page.goto('/connections-list');
		await page.getByRole('button', { name: ADMIN_EMAIL }).click();
		await page
			.getByRole('menuitem', { name: /Account|Settings/ })
			.first()
			.click();

		await expect(page).toHaveURL(/\/user-settings$/);
		await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible();
	});

	test('changes the user name', async ({ page, backend }) => {
		await page.goto('/user-settings');
		const save = page.getByRole('button', { name: 'Save' });
		await expect(save).toBeDisabled();

		await page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace');
		await save.click();

		await expect.poll(() => backend.state.user.name).toBe('Ada Lovelace');
	});

	test('enables two-factor authentication', async ({ page, backend }) => {
		await page.goto('/user-settings');
		await page.getByText('Two-factor authentication', { exact: true }).click();

		const dialog = page.getByRole('dialog', { name: 'Enable 2FA' });
		await dialog.getByRole('textbox', { name: 'Enter the code from your authenticator' }).fill('123456');
		await dialog.getByRole('button', { name: 'Enable' }).click();

		await expect.poll(() => backend.state.user.is_2fa_enabled).toBe(true);
		await expect(page.getByRole('switch', { name: 'Two-factor authentication' })).toBeChecked();
	});

	test('requests an email change', async ({ page, backend }) => {
		await page.goto('/user-settings');
		await page.getByRole('button', { name: 'Change email' }).click();
		await expect.poll(() => backend.callsTo('GET', '/user/email/change/request')).toHaveLength(1);
	});

	test('deleting the account asks for confirmation first', async ({ page, backend }) => {
		await page.goto('/user-settings');
		await page.getByRole('button', { name: 'Delete account' }).click();

		const dialog = page.getByRole('dialog', { name: `Delete ${ADMIN_EMAIL} account` });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Abort' }).click();

		await expect(dialog).toBeHidden();
		expect(backend.callsTo('PUT', '/user/delete')).toHaveLength(0);
	});
});

test.describe('API keys', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('generates a key and shows its secret once', async ({ page, backend }) => {
		await page.goto('/api-keys');
		await expect(page.getByText('CI pipeline')).toBeVisible();

		await page.getByRole('textbox', { name: 'API key title' }).fill('Zapier');
		await page.getByRole('button', { name: 'Generate' }).click();

		await expect(page.getByRole('textbox', { name: 'API key', exact: true })).toHaveValue(/^sk_test_/);
		await expect(page.getByText('Zapier', { exact: true })).toBeVisible();
		expect(backend.state.apiKeys.map((k) => k.title)).toEqual(['CI pipeline', 'Zapier']);
	});

	test('deletes a key', async ({ page, backend }) => {
		await page.goto('/api-keys');
		await page.getByRole('button', { name: /Delete/ }).click();
		await page.getByRole('dialog', { name: 'Confirm API key delete' }).getByRole('button', { name: 'Delete' }).click();

		await expect(page.getByText("You don't have any API keys yet.")).toBeVisible();
		expect(backend.state.apiKeys).toHaveLength(0);
	});
});

test.describe('company', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('renames the company', async ({ page, backend }) => {
		await page.goto('/company');
		await page.getByRole('textbox', { name: 'Company name' }).fill('Difference Engines Ltd');
		await page.getByRole('button', { name: 'Save' }).click();

		await expect.poll(() => backend.state.company.name).toBe('Difference Engines Ltd');
	});

	test('invites a member', async ({ page, backend }) => {
		await page.goto('/company');
		await page.getByRole('button', { name: 'Invite member' }).click();

		const dialog = page.getByRole('dialog', { name: 'Add member to Analytical Engines Ltd company' });
		await dialog.getByRole('textbox', { name: 'Enter user email' }).fill('charles@example.com');
		await dialog.getByRole('button', { name: 'Add' }).click();

		await expect(page.getByRole('table', { name: 'Company members' })).toContainText('charles@example.com');
		expect(backend.callsTo('PUT', '/company/user/')[0].body).toMatchObject({ email: 'charles@example.com' });
	});

	test('changes a member role', async ({ page, backend }) => {
		await page.goto('/company');
		await page
			.getByRole('row', { name: /bob@example.com/ })
			.getByRole('button', { name: 'Member' })
			.click();
		await page.getByRole('menuitem', { name: 'System Admin' }).click();

		await expect(notification(page, 'Company member role has been updated.')).toBeVisible();
		expect(backend.state.companyMembers.find((m) => m.id === 'user-bob')?.role).toBe('DB_ADMIN');
	});

	test('removes a member', async ({ page, backend }) => {
		await page.goto('/company');
		await page
			.getByRole('row', { name: /bob@example.com/ })
			.getByRole('button', { name: 'Delete' })
			.click();
		await page
			.getByRole('dialog', { name: 'Confirm member delete' })
			.getByRole('button', { name: /Delete|Remove/ })
			.click();

		await expect(page.getByRole('row', { name: /bob@example.com/ })).toBeHidden();
		expect(backend.state.companyMembers.map((m) => m.email)).toEqual([ADMIN_EMAIL]);
	});
});

test.describe('secrets', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('creates a secret', async ({ page, backend }) => {
		await page.goto('/secrets');
		await page.getByRole('button', { name: 'Create Secret' }).click();

		const dialog = page.getByRole('dialog', { name: 'Create Secret' });
		await dialog.getByRole('textbox', { name: 'Unique Identifier' }).fill('slack-token');
		await dialog.getByRole('textbox', { name: 'Secret Value' }).fill('xoxb-123');
		await dialog.getByRole('button', { name: 'Create Secret' }).click();

		await expect(page.getByRole('table', { name: 'Secrets' })).toContainText('slack-token');
		expect(backend.callsTo('POST', '/secrets')[0].body).toMatchObject({ slug: 'slack-token', value: 'xoxb-123' });
	});

	test('deletes a secret', async ({ page, backend }) => {
		await page.goto('/secrets');
		await page.getByRole('button', { name: 'Actions for stripe-api-key' }).click();
		await page.getByRole('menuitem', { name: /Delete/ }).click();
		await page
			.getByRole('dialog', { name: 'Delete Secret' })
			.getByRole('button', { name: /Delete/ })
			.click();

		await expect(page.getByRole('cell', { name: 'stripe-api-key', exact: true })).toBeHidden();
		expect(backend.state.secrets).toHaveLength(0);
	});

	test('searches secrets', async ({ page, backend }) => {
		await page.goto('/secrets');
		await page.getByRole('searchbox', { name: 'Search secrets' }).fill('stripe');
		await expect.poll(() => backend.callsTo('GET', '/secrets').at(-1)?.query.search).toBe('stripe');
	});
});
