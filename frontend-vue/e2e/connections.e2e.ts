import { CONNECTION_ID } from './support/fixtures';
import { expect, notification, test } from './support/test';

test.describe('connections', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('lists the company connections and opens one', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/connections-list$/);
		await expect(page.getByRole('heading', { name: 'Analytical Engines Ltd' })).toBeVisible();

		await page.getByRole('link', { name: /Shop DB PostgreSQL/ }).click();
		await expect(page).toHaveURL(new RegExp(`/dashboard/${CONNECTION_ID}/customers$`));
		await expect(page.getByRole('table', { name: 'Customers' })).toBeVisible();
	});

	test('adds a PostgreSQL connection and runs the auto-configuration', async ({ page, backend }) => {
		await page.goto('/connections-list');
		await page.getByRole('link', { name: 'Add database' }).click();
		await expect(page.getByRole('heading', { name: 'Connect database' })).toBeVisible();

		await page.getByRole('textbox', { name: 'Connection title' }).fill('Analytics');
		await page.getByRole('combobox', { name: 'Database type' }).selectOption({ label: 'PostgreSQL' });
		await page.getByRole('textbox', { name: 'Hostname' }).fill('analytics.example.com');
		await page.getByRole('spinbutton', { name: 'Port' }).fill('5432');
		await page.getByRole('textbox', { name: 'Username' }).fill('reporter');
		await page.getByRole('textbox', { name: 'Password' }).fill('s3cret');
		await page.getByRole('textbox', { name: 'Database Name' }).fill('analytics');
		await page.getByRole('button', { name: 'Add' }).click();

		await page
			.getByRole('dialog', { name: 'Give access to our IP address' })
			.getByRole('button', { name: "I've given access" })
			.click();

		await expect(page).toHaveURL(/\/auto-configure\//);
		await expect(page.getByText('Your database is ready')).toBeVisible();
		expect(backend.callsTo('POST', '/connection/test')).toHaveLength(1);
		expect(backend.callsTo('POST', '/connection')[0].body).toMatchObject({
			title: 'Analytics',
			type: 'postgres',
			host: 'analytics.example.com',
			port: 5432,
			username: 'reporter',
			password: 's3cret',
			database: 'analytics',
		});
		expect(backend.state.connections.map((c) => c.title)).toContain('Analytics');
	});

	test('fills the form from a connection string', async ({ page }) => {
		await page.goto('/connect-db');
		await page.getByRole('combobox', { name: 'Database type' }).selectOption({ label: 'PostgreSQL' });
		await page
			.getByRole('textbox', { name: 'Connection string' })
			.fill('postgresql://reporter:pw@analytics.example.com:6543/warehouse');

		await expect(page.getByRole('textbox', { name: 'Hostname' })).toHaveValue('analytics.example.com');
		await expect(page.getByRole('spinbutton', { name: 'Port' })).toHaveValue('6543');
		await expect(page.getByRole('textbox', { name: 'Username' })).toHaveValue('reporter');
		await expect(page.getByRole('textbox', { name: 'Database Name' })).toHaveValue('warehouse');
	});

	test('a failing connection test shows the database error', async ({ page }) => {
		await page.goto('/connect-db');
		await page.getByRole('combobox', { name: 'Database type' }).selectOption({ label: 'PostgreSQL' });
		await page.getByRole('textbox', { name: 'Hostname' }).fill('unreachable.example.com');
		await page.getByRole('spinbutton', { name: 'Port' }).fill('5432');
		await page.getByRole('textbox', { name: 'Username' }).fill('nobody');
		await page.getByRole('textbox', { name: 'Database Name' }).fill('missing');
		await page.getByRole('button', { name: 'Test connection' }).click();

		await expect(notification(page, 'getaddrinfo ENOTFOUND unreachable.example.com')).toBeVisible();
	});

	test('a passing connection test says the connection is live', async ({ page }) => {
		await page.goto(`/edit-db/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'Test connection' }).click();
		await expect(notification(page, 'Connection is live')).toBeVisible();
	});

	test('edits the credentials of a connection', async ({ page, backend }) => {
		await page.goto(`/edit-db/${CONNECTION_ID}`);
		await expect(page.getByRole('textbox', { name: 'Hostname' })).toHaveValue('db.example.com');

		await page.getByRole('textbox', { name: 'Connection title' }).fill('Shop DB (replica)');
		await page.getByRole('textbox', { name: 'Hostname' }).fill('replica.example.com');
		await page.getByRole('button', { name: 'Edit' }).click();

		await expect(page).toHaveURL(new RegExp(`/dashboard/${CONNECTION_ID}`));
		expect(backend.state.connections[0]).toMatchObject({ title: 'Shop DB (replica)', host: 'replica.example.com' });
	});

	test('deletes a connection', async ({ page, backend }) => {
		await page.goto(`/edit-db/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'Delete' }).click();

		const dialog = page.getByRole('dialog', { name: 'Delete Shop DB connection' });
		await dialog.getByRole('button', { name: 'Proceed' }).click();

		await expect(page).toHaveURL(/\/connections-list$/);
		await expect(notification(page, 'Connection has been deleted successfully.')).toBeVisible();
		expect(backend.state.connections).toHaveLength(0);
	});

	test('saves connection settings', async ({ page, backend }) => {
		await page.goto(`/connection-settings/${CONNECTION_ID}`);
		await page.getByRole('listbox', { name: 'Hidden tables' }).getByRole('option', { name: 'Orders (orders)' }).click();
		await page
			.getByRole('combobox', { name: 'Table displayed by default' })
			.selectOption({ label: 'Customers (customers)' });
		await page.getByRole('button', { name: 'Save' }).click();

		await expect(notification(page, /Connection settings has been (created|updated) successfully/)).toBeVisible();
		expect(backend.state.connectionProperties[CONNECTION_ID]).toMatchObject({
			hidden_tables: ['orders'],
			default_showing_table: 'customers',
		});
	});
});
