import { CONNECTION_ID } from './support/fixtures';
import { expect, notification, test } from './support/test';

const customersUrl = `/dashboard/${CONNECTION_ID}/customers`;

test.describe('table configuration', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('the table settings menu leads to widgets, automations and settings', async ({ page }) => {
		await page.goto(customersUrl);
		await page.getByRole('button', { name: 'Table settings' }).click();
		await expect(page.getByRole('menuitem')).toHaveText(['UI Widgets', 'Automations', 'Settings']);

		await page.getByRole('menuitem', { name: 'Settings' }).click();
		await expect(page).toHaveURL(new RegExp(`${customersUrl}/settings$`));
		await expect(page.getByRole('heading', { name: 'General settings' })).toBeVisible();
	});

	test('saves table settings and uses the new display name', async ({ page, backend }) => {
		await page.goto(`${customersUrl}/settings`);
		await page.getByRole('textbox', { name: 'Displayed table name' }).fill('Clients');
		// The switch input sits under its styled track; its label is what a user clicks.
		await page.getByText('Allow row deletion', { exact: true }).click();
		await expect(page.getByRole('switch', { name: 'Allow row deletion' })).not.toBeChecked();
		await page.getByRole('button', { name: 'Save' }).click();

		await expect
			.poll(() => backend.state.tableSettings[`${CONNECTION_ID}/customers`])
			.toMatchObject({
				display_name: 'Clients',
				can_delete: false,
			});
	});

	test('adds a widget to a column', async ({ page, backend }) => {
		await page.goto(`${customersUrl}/widgets`);
		await page.getByRole('button', { name: 'Create first widget' }).click();

		await page.getByRole('combobox', { name: 'Field', exact: true }).selectOption('email');
		await page.getByRole('combobox', { name: 'Displayed field type' }).selectOption('Email');
		await page.getByRole('textbox', { name: 'Displayed field name' }).fill('Contact email');
		await page.getByRole('button', { name: 'Save' }).click();

		await expect
			.poll(() => backend.state.tables[CONNECTION_ID].customers.widgets)
			.toEqual([expect.objectContaining({ field_name: 'email', widget_type: 'Email', name: 'Contact email' })]);
	});

	test('creates a webhook automation for new rows', async ({ page, backend }) => {
		await page.goto(`${customersUrl}/actions`);
		await page.getByRole('button', { name: 'Create first automation' }).click();

		await page.getByRole('textbox', { name: 'Automation name' }).fill('Notify CRM');
		await page.getByRole('checkbox', { name: 'Add row' }).check();
		const action = page.getByRole('region', { name: 'THEN Action' });
		await expect(action.getByRole('radio', { name: 'URL webhook' })).toBeChecked();
		await action.getByRole('textbox', { name: 'Webhook URL' }).fill('https://crm.example.com/hooks/new-customer');
		await page.getByRole('button', { name: 'Save' }).click();

		await expect.poll(() => backend.state.rules).toHaveLength(1);
		expect(backend.state.rules[0]).toMatchObject({ title: 'Notify CRM', table_name: 'customers' });
		await expect(page.getByRole('complementary', { name: 'Automations' })).toContainText('Notify CRM');
	});

	test('the breadcrumb leads back to the table', async ({ page }) => {
		await page.goto(`${customersUrl}/widgets`);
		await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Customers' }).click();
		await expect(page).toHaveURL(new RegExp(`${customersUrl}(\\?|$)`));
		await expect(page.getByRole('table', { name: 'Customers' })).toBeVisible();
	});
});

test('table settings save errors are shown', async ({ page, signIn, backend }) => {
	const { reply } = await import('./support/mock-backend');
	backend.override('PUT', '/settings', () => reply(400, { message: 'Column "nope" does not exist' }));
	backend.override('POST', '/settings', () => reply(400, { message: 'Column "nope" does not exist' }));
	await signIn();
	await page.goto(`${customersUrl}/settings`);
	await page.getByRole('textbox', { name: 'Displayed table name' }).fill('Clients');
	await page.getByRole('button', { name: 'Save' }).click();

	await expect(notification(page, 'Column "nope" does not exist')).toBeVisible();
});
