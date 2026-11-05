import { CONNECTION_ID } from './support/fixtures';
import { expect, test } from './support/test';

test.describe('dashboards', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('creates a dashboard and opens it', async ({ page, backend }) => {
		await page.goto(`/dashboards/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'Create dashboard' }).click();

		const dialog = page.getByRole('dialog', { name: 'Create dashboard' });
		await dialog.getByRole('textbox', { name: 'Name' }).fill('Support metrics');
		await dialog.getByRole('textbox', { name: 'Description' }).fill('Tickets per day');
		await dialog.getByRole('button', { name: 'Create' }).click();

		expect(backend.state.dashboards.map((d) => d.name)).toContain('Support metrics');
		await page.getByRole('link', { name: 'Support metrics' }).click();
		await expect(page.getByRole('heading', { name: 'Support metrics', level: 1 })).toBeVisible();
		await expect(page.getByText('Tickets per day')).toBeVisible();
	});

	test('opens a dashboard from the list and goes back', async ({ page }) => {
		await page.goto(`/dashboards/${CONNECTION_ID}`);
		await page.getByRole('link', { name: 'Sales overview' }).click();

		await expect(page).toHaveURL(new RegExp(`/dashboards/${CONNECTION_ID}/dash-sales$`));
		await expect(page.getByRole('heading', { name: 'No panels yet' })).toBeVisible();
		await page.getByRole('button', { name: 'Back to dashboards' }).click();
		await expect(page).toHaveURL(new RegExp(`/dashboards/${CONNECTION_ID}$`));
	});

	test('adds a saved query to a dashboard as a panel', async ({ page, backend }) => {
		await page.goto(`/dashboards/${CONNECTION_ID}/dash-sales`);
		await page.getByRole('button', { name: 'Add panel' }).click();

		const dialog = page.getByRole('dialog', { name: 'Add panel' });
		await dialog.getByRole('combobox', { name: 'Saved query' }).selectOption({ label: 'Orders by status' });
		await dialog.getByRole('button', { name: 'Add' }).click();

		await expect(page.getByRole('heading', { name: 'No panels yet' })).toBeHidden();
		await expect(page.getByText('Orders by status')).toBeVisible();
		expect(backend.state.dashboards[0].widgets).toEqual([expect.objectContaining({ query_id: 'query-status' })]);
	});

	test('renames a dashboard', async ({ page, backend }) => {
		await page.goto(`/dashboards/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'Dashboard actions' }).click();
		await page.getByRole('menuitem', { name: /Edit/ }).click();

		const dialog = page.getByRole('dialog', { name: 'Edit dashboard' });
		await dialog.getByRole('textbox', { name: 'Name' }).fill('Sales (daily)');
		await dialog.getByRole('button', { name: 'Update' }).click();

		await expect(page.getByRole('link', { name: 'Sales (daily)' })).toBeVisible();
		expect(backend.state.dashboards[0].name).toBe('Sales (daily)');
	});

	test('deletes a dashboard', async ({ page, backend }) => {
		await page.goto(`/dashboards/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'Dashboard actions' }).click();
		await page.getByRole('menuitem', { name: /Delete/ }).click();
		await page
			.getByRole('dialog', { name: 'Delete dashboard' })
			.getByRole('button', { name: 'Delete dashboard' })
			.click();

		await expect(page.getByRole('link', { name: 'Sales overview' })).toBeHidden();
		expect(backend.state.dashboards).toHaveLength(0);
	});
});

test.describe('panels (saved queries)', () => {
	test.beforeEach(async ({ signIn }) => {
		await signIn();
	});

	test('lists saved queries and searches them', async ({ page }) => {
		await page.goto(`/panels/${CONNECTION_ID}`);
		const table = page.getByRole('table', { name: 'Panels' });
		await expect(table.getByRole('row')).toHaveCount(2);

		await page.getByRole('searchbox', { name: 'Search panels' }).fill('nothing like this');
		await expect(table.getByRole('row', { name: /Orders by status/ })).toBeHidden();
	});

	test('edits a saved query, runs it and saves it', async ({ page, backend }) => {
		await page.goto(`/panels/${CONNECTION_ID}`);
		await page.getByRole('cell', { name: 'Orders by status' }).click();
		await expect(page).toHaveURL(new RegExp(`/panels/${CONNECTION_ID}/query-status$`));

		await page.getByRole('textbox', { name: 'Query name' }).fill('Orders per status');
		await page.getByRole('button', { name: 'Test query' }).click();
		await expect(page.getByText(/Executed in \d+ms/)).toBeVisible();

		await page.getByRole('button', { name: 'Update query' }).click();
		await expect.poll(() => backend.state.savedQueries[0].name).toBe('Orders per status');
	});

	test('creates a saved query with SQL', async ({ page, backend }) => {
		await page.goto(`/panels/${CONNECTION_ID}/new`);
		await page.getByRole('button', { name: 'Manual configuration' }).click();
		await page.getByRole('textbox', { name: 'Query name' }).fill('VIP customers');

		const editor = page.locator('.monaco-editor').first();
		await editor.click();
		await page.keyboard.type('SELECT * FROM customers WHERE is_vip');
		await page.getByRole('button', { name: 'Save query' }).click();

		await expect.poll(() => backend.state.savedQueries.map((q) => q.name)).toContain('VIP customers');
		expect(backend.state.savedQueries.at(-1)?.query_text).toContain('SELECT * FROM customers WHERE is_vip');
	});

	test('deletes a saved query', async ({ page, backend }) => {
		await page.goto(`/panels/${CONNECTION_ID}`);
		await page.getByRole('button', { name: 'Panel actions' }).click();
		await page.getByRole('menuitem', { name: /Delete/ }).click();
		await page
			.getByRole('dialog', { name: 'Delete saved query' })
			.getByRole('button', { name: 'Delete query' })
			.click();

		await expect.poll(() => backend.state.savedQueries).toHaveLength(0);
		await expect(page.getByRole('cell', { name: 'Orders by status' })).toBeHidden();
	});
});
