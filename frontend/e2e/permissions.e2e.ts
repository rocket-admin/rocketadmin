import { CONNECTION_ID } from './support/fixtures';
import { expect, test } from './support/test';

test.describe('user groups', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('lists the groups with their members', async ({ page }) => {
		await page.goto(`/permissions/${CONNECTION_ID}`);
		await expect(page.getByRole('heading', { name: 'User groups' })).toBeVisible();
		await expect(page.getByRole('region', { name: /Admin/ })).toContainText('ada@example.com');
		await expect(page.getByText('Company members who do NOT have access to this connection:')).toBeVisible();
	});

	test('creates a group', async ({ page, backend }) => {
		await page.goto(`/permissions/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'New group' }).click();

		const dialog = page.getByRole('dialog', { name: 'Create group of users' });
		await dialog.getByRole('textbox', { name: 'Enter group title' }).fill('Support');
		await dialog.getByRole('button', { name: 'Create' }).click();

		await expect(page.getByRole('button', { name: /^Support/ })).toBeVisible();
		expect(backend.state.groups.map((g) => g.title)).toContain('Support');
	});

	test('adds a company member to a group', async ({ page, backend }) => {
		await page.goto(`/permissions/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'Add user' }).click();

		const dialog = page.getByRole('dialog', { name: 'Add user to Admin group' });
		await dialog
			.getByRole('combobox', { name: 'Select user' })
			.selectOption({ label: 'Bob Builder (bob@example.com)' });
		await dialog.getByRole('button', { name: 'Add' }).click();

		await expect(page.getByRole('region', { name: /Admin/ })).toContainText('bob@example.com');
		expect(backend.callsTo('PUT', '/group/user')[0].body).toMatchObject({
			email: 'bob@example.com',
			groupId: 'group-admin',
		});
	});

	test('deletes a group', async ({ page, backend }) => {
		backend.state.groups.push({ id: 'group-support', title: 'Support', isMain: false, cedarPolicy: null, users: [] });
		await page.goto(`/permissions/${CONNECTION_ID}`);
		await page.getByRole('button', { name: /^Support/ }).click();
		await page.getByRole('button', { name: /Delete group|Delete Support/ }).click();

		await page
			.getByRole('dialog', { name: 'Confirm users group delete' })
			.getByRole('button', { name: 'Delete' })
			.click();

		await expect(page.getByRole('button', { name: /^Support/ })).toBeHidden();
		expect(backend.state.groups.map((g) => g.id)).toEqual(['group-admin']);
	});
});

test.describe('audit log', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('shows the logged changes and their details', async ({ page }) => {
		await page.goto(`/audit/${CONNECTION_ID}`);
		const log = page.getByRole('table', { name: 'Audit log' });
		await expect(log.getByRole('row')).toHaveCount(2);
		await expect(log).toContainText('Grace Hopper'.length ? 'customers' : '');

		await log.getByRole('button', { name: 'Details' }).click();
		await expect(page.getByRole('dialog')).toContainText('Grace Hopper');
	});

	test('filters the log by table', async ({ page, backend }) => {
		await page.goto(`/audit/${CONNECTION_ID}`);
		await page.getByRole('combobox', { name: 'Tables' }).selectOption({ label: 'Orders (orders)' });

		await expect.poll(() => backend.callsTo('GET', `/logs/${CONNECTION_ID}`).at(-1)?.query.tableName).toBe('orders');
	});
});
