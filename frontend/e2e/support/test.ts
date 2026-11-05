// The `test` every spec imports. Each test gets its own mock backend (`backend`); pages behind
// the login start signed in through `signIn()`. A request the mock does not know, or an uncaught
// error in the page, fails the test, so a broken screen cannot pass silently.
import { test as base, expect, type Page } from '@playwright/test';
import { MockBackend } from './mock-backend';

interface Fixtures {
	backend: MockBackend;
	pageErrors: string[];
	signIn: () => Promise<void>;
}

export const test = base.extend<Fixtures>({
	backend: [
		async ({ page }, use) => {
			const backend = new MockBackend();
			await backend.attach(page);
			await use(backend);
			expect(backend.unhandled, 'requests the mock backend does not answer').toEqual([]);
		},
		{ auto: true },
	],
	pageErrors: [
		async ({ page }, use) => {
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
			await use(errors);
			expect(errors, 'uncaught errors in the page').toEqual([]);
		},
		{ auto: true },
	],
	signIn: async ({ page }, use) => {
		await use(async () => {
			// The session is an httpOnly cookie the mock never checks; the app only reads its expiry.
			await page.addInitScript(() => {
				localStorage.setItem('token_expiration', new Date(Date.now() + 24 * 3_600_000).toISOString());
			});
		});
	},
});

export { expect };

/** The snackbar or alert that shows `text`. */
export function notification(page: Page, text: string | RegExp) {
	return page.getByText(text).first();
}
