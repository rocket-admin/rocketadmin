// Every signed-in page loads, answers from the mock backend only and shows its main heading.
// The fixtures fail a test on any unmocked request or uncaught page error.
import { CONNECTION_ID as c } from './support/fixtures';
import { expect, test } from './support/test';

const pages: [path: string, heading: string | RegExp][] = [
	['/connections-list', 'Analytical Engines Ltd'],
	['/connect-db', 'Connect database'],
	[`/edit-db/${c}`, 'Edit credentials'],
	[`/connection-settings/${c}`, /Settings for\s*Shop DB\s*connection/],
	[`/auto-configure/${c}`, /Your database is ready|Configuring/],
	[`/dashboard/${c}/customers`, 'Customers'],
	[`/dashboard/${c}/customers/entry`, 'Add row'],
	[`/dashboard/${c}/orders/entry?id=1`, 'Edit row'],
	[`/dashboard/${c}/customers/widgets`, 'Make your data easier to read and edit'],
	[`/dashboard/${c}/customers/settings`, 'General settings'],
	[`/dashboard/${c}/customers/actions`, 'Automations'],
	[`/permissions/${c}`, 'User groups'],
	[`/audit/${c}`, 'Audit'],
	[`/panels/${c}`, 'Panels'],
	[`/panels/${c}/new`, 'Create panel'],
	[`/panels/${c}/query-status`, 'Edit panel'],
	[`/dashboards/${c}`, 'Dashboards'],
	[`/dashboards/${c}/dash-sales`, 'Sales overview'],
	[`/edit-database-schema/${c}`, 'Edit Database Schema'],
	['/company', /Analytical Engines Ltd\s*company settings/],
	['/user-settings', 'Account settings'],
	['/api-keys', 'API Keys'],
	['/secrets', 'Company Secrets'],
	['/change-password', 'Change password'],
];

for (const [path, heading] of pages) {
	test(`${path} loads`, async ({ page, signIn }) => {
		await signIn();
		await page.goto(path);
		await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
	});
}

test('the page title follows the route', async ({ page, signIn }) => {
	await signIn();
	await page.goto('/secrets');
	await expect(page).toHaveTitle('Secrets | Rocketadmin');
	await page.goto(`/dashboard/${c}/customers`);
	await expect(page).toHaveTitle('Customers table | Rocketadmin');
});

test('a refresh on /api-keys loads the app, not the proxied API', async ({ page, signIn }) => {
	await signIn();
	const response = await page.goto('/api-keys');
	expect(await response?.text()).toContain('<div id="app"');
	await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();
});
