// The colour theme of the app. The user picks `system`, `light` or `dark` on the account page.
// `applyTheme` writes the result to <html> as `data-theme="light"` or `data-theme="dark"`. The
// file theme.css swaps the semantic tokens on that attribute. The browser keeps a copy of the choice
// in localStorage, so that the first paint uses it before the server settings arrive.

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

const THEME_STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemePreference(value: unknown): value is ThemePreference {
	return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** The preference that this browser keeps, or `system` when it keeps none. */
export function readStoredTheme(): ThemePreference {
	try {
		const value = localStorage.getItem(THEME_STORAGE_KEY);
		return isThemePreference(value) ? value : 'system';
	} catch {
		return 'system';
	}
}

export function storeTheme(theme: ThemePreference): void {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Storage is not available (for example, a private window). The server copy still applies.
	}
}

export function systemPrefersDark(): boolean {
	return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** Calls `listener` when the OS setting changes. Returns the function that stops the listener. */
export function onSystemThemeChange(listener: (dark: boolean) => void): () => void {
	if (typeof window.matchMedia !== 'function') return () => {};
	const query = window.matchMedia(DARK_QUERY);
	const handler = (event: MediaQueryListEvent) => listener(event.matches);
	query.addEventListener?.('change', handler);
	return () => query.removeEventListener?.('change', handler);
}

export function applyTheme(dark: boolean): void {
	document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
