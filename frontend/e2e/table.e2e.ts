import type { Page } from '@playwright/test';
import { CONNECTION_ID } from './support/fixtures';
import { expect, notification, test } from './support/test';

const customersUrl = `/dashboard/${CONNECTION_ID}/customers`;

function customersTable(page: Page) {
	return page.getByRole('table', { name: 'Customers' });
}

/** The body row whose text contains `text`. */
function rowWith(page: Page, text: string) {
	return customersTable(page).getByRole('row').filter({ hasText: text });
}

test.describe('table data', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('opening a connection shows its first table with all rows', async ({ page }) => {
		await page.goto(`/dashboard/${CONNECTION_ID}`);
		await expect(page).toHaveURL(new RegExp(`${customersUrl}$`));
		await expect(page.getByRole('heading', { name: 'Customers', level: 2 })).toBeVisible();
		// Header plus three rows.
		await expect(customersTable(page).getByRole('row')).toHaveCount(4);
		await expect(page.getByText('1 – 3 of 3')).toBeVisible();
	});

	test('switches tables from the sidebar', async ({ page }) => {
		await page.goto(customersUrl);
		await page.getByRole('complementary', { name: 'Tables' }).getByRole('link', { name: 'Orders' }).click();

		await expect(page).toHaveURL(new RegExp(`/dashboard/${CONNECTION_ID}/orders`));
		await expect(page.getByRole('table', { name: 'Orders' })).toBeVisible();
		await expect(page.getByRole('table', { name: 'Orders' }).getByRole('row')).toHaveCount(4);
	});

	test('filters the sidebar table list', async ({ page }) => {
		await page.goto(customersUrl);
		const sidebar = page.getByRole('complementary', { name: 'Tables' });
		await sidebar.getByRole('searchbox', { name: 'Search tables' }).fill('ord');

		await expect(sidebar.getByRole('link', { name: 'Orders' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Customers' })).toBeHidden();
	});

	test('searches rows', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await page.getByRole('textbox', { name: 'Search' }).fill('turing');
		await page.getByRole('textbox', { name: 'Search' }).press('Enter');

		await expect(customersTable(page).getByRole('row')).toHaveCount(2);
		await expect(rowWith(page, 'Alan Turing')).toBeVisible();
		expect(backend.callsTo('POST', '/table/rows/find').at(-1)?.query.search).toBe('turing');
	});

	test('sorts by a column', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await customersTable(page).getByRole('button', { name: 'Sort by Name' }).click();
		await page.getByRole('menuitem', { name: 'Descending (Z-A)' }).click();

		await expect(customersTable(page).getByRole('row').nth(1)).toContainText('Katherine Johnson');
		expect(backend.callsTo('POST', '/table/rows/find').at(-1)?.query).toMatchObject({
			sort_by: 'name',
			sort_order: 'DESC',
		});
	});

	test('filters rows through the filter dialog', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await page.getByTestId('table-filter-button').click();

		const dialog = page.getByRole('dialog', { name: 'Filters' });
		await dialog.getByRole('combobox', { name: 'Add filter by...' }).fill('Name');
		await dialog.getByRole('option', { name: 'Name' }).click();
		await dialog.locator('[data-field="name"]').getByRole('textbox').fill('Grace Hopper');
		await dialog.getByRole('button', { name: 'Filter' }).click();

		await expect(customersTable(page).getByRole('row')).toHaveCount(2);
		await expect(rowWith(page, 'Grace Hopper')).toBeVisible();
		expect(backend.callsTo('POST', '/table/rows/find').at(-1)?.body).toMatchObject({
			filters: { name: expect.anything() },
		});
	});

	test('adds a row', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await page.getByRole('link', { name: 'Add row' }).click();
		await expect(page.getByRole('heading', { name: 'Add row' })).toBeVisible();

		await page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace');
		await page.getByRole('textbox', { name: 'Email' }).fill('ada.lovelace@example.com');
		await page.getByRole('radiogroup', { name: 'Is VIP' }).getByRole('radio', { name: 'Yes' }).check();
		await page.getByRole('button', { name: 'Add', exact: true }).click();

		await expect(notification(page, 'The row has been added successfully to "customers" table.')).toBeVisible();
		expect(backend.callsTo('POST', /^\/table\/row\//)[0].body).toMatchObject({
			name: 'Ada Lovelace',
			email: 'ada.lovelace@example.com',
			is_vip: true,
		});
		expect(backend.state.tables[CONNECTION_ID].customers.rows).toHaveLength(4);
	});

	test('edits a row', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await rowWith(page, 'Alan Turing').getByRole('link', { name: 'Edit row' }).click();
		await expect(page.getByRole('heading', { name: 'Edit row' })).toBeVisible();
		await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Alan Turing');

		await page.getByRole('textbox', { name: 'Email' }).fill('alan.turing@example.com');
		await page.getByRole('button', { name: 'Save', exact: true }).click();

		await expect(notification(page, 'The row has been updated successfully in "customers" table.')).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`${customersUrl}(\\?|$)`));
		expect(backend.state.tables[CONNECTION_ID].customers.rows[1].email).toBe('alan.turing@example.com');
	});

	test('a required field blocks saving until it is filled', async ({ page }) => {
		await page.goto(`${customersUrl}/entry`);
		const add = page.getByRole('button', { name: 'Add', exact: true });
		await expect(add).toBeDisabled();
		await page.getByRole('textbox', { name: 'Name' }).fill('Someone');
		await expect(add).toBeEnabled();
	});

	test('duplicates a row into a prefilled add form', async ({ page }) => {
		await page.goto(customersUrl);
		await rowWith(page, 'Grace Hopper').getByRole('link', { name: 'Duplicate row' }).click();

		await expect(page.getByRole('heading', { name: 'Duplicate row' })).toBeVisible();
		await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace Hopper');
		await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('grace@example.com');
	});

	test('deletes a row', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await rowWith(page, 'Katherine Johnson').getByRole('button', { name: 'Delete row' }).click();

		const dialog = page.getByRole('dialog', { name: 'Confirm delete row for Customers table' });
		await dialog.getByRole('button', { name: 'Delete row' }).click();

		await expect(rowWith(page, 'Katherine Johnson')).toHaveCount(0);
		expect(backend.state.tables[CONNECTION_ID].customers.rows.map((r) => r.name)).not.toContain('Katherine Johnson');
	});

	test('deletes the selected rows in bulk', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await rowWith(page, 'Grace Hopper').getByRole('checkbox').check();
		await rowWith(page, 'Alan Turing').getByRole('checkbox').check();
		await page.getByTestId('table-bulk-actions').getByRole('button', { name: 'Delete', exact: true }).click();

		await page
			.getByRole('dialog', { name: /Confirm delete rows for Customers table/ })
			.getByRole('button', { name: 'Delete rows' })
			.click();

		await expect(customersTable(page).getByRole('row')).toHaveCount(2);
		expect(backend.state.tables[CONNECTION_ID].customers.rows.map((r) => r.name)).toEqual(['Katherine Johnson']);
	});

	test('opens a row in the side panel', async ({ page }) => {
		await page.goto(customersUrl);
		await rowWith(page, 'Grace Hopper').getByRole('cell', { name: 'grace@example.com' }).click();

		const preview = page.getByRole('complementary', { name: 'Preview' });
		await expect(preview).toContainText('Grace Hopper');
		await expect(preview.getByRole('heading', { name: 'Related records' })).toBeVisible();
		await expect(preview).toContainText('Orders');

		await preview.getByRole('button', { name: 'Close' }).click();
		await expect(preview).toBeHidden();
	});

	test('edit row shows the foreign key and links to the related record', async ({ page }) => {
		await page.goto(`/dashboard/${CONNECTION_ID}/orders/entry?id=1`);
		await expect(page.getByRole('combobox', { name: 'Customer ID' })).toHaveValue(/Grace Hopper/);
		await expect(page.getByRole('link', { name: 'Show related record' })).toHaveAttribute('href', /customers/);
	});

	test('exports the table to CSV', async ({ page, backend }) => {
		await page.goto(customersUrl);
		await page.getByRole('button', { name: 'Import / Export' }).click();
		await page.getByRole('menuitem', { name: 'Export' }).click();

		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('dialog', { name: 'Export' }).getByRole('button', { name: 'Export' }).click();
		const download = await downloadPromise;

		// Same file name as the Angular export dialog.
		expect(download.suggestedFilename()).toBe('database.csv');
		const csv = await (await download.createReadStream()).toArray();
		expect(Buffer.concat(csv).toString()).toContain('Grace Hopper');
		expect(backend.callsTo('POST', '/table/csv/export')).toHaveLength(1);
	});

	test('shows the server error when the rows cannot be loaded', async ({ page, backend }) => {
		const { reply } = await import('./support/mock-backend');
		backend.override('POST', '/table/rows/find/:p', () => reply(500, { message: 'relation "customers" is locked' }));
		await page.goto(customersUrl);

		await expect(notification(page, 'relation "customers" is locked')).toBeVisible();
	});
});
