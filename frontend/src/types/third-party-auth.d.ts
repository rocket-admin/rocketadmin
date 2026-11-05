// Globals injected by index.saas.html for the auth flows: Cloudflare Turnstile
// (frontend/src/app/types/turnstile.d.ts) and Google Identity Services (`google.accounts.id`).

export interface TurnstileOptions {
	sitekey: string;
	callback?: (token: string) => void;
	'error-callback'?: () => void;
	'expired-callback'?: () => void;
	theme?: 'light' | 'dark' | 'auto';
	appearance?: 'always' | 'execute' | 'interaction-only';
	size?: 'normal' | 'compact';
}

export interface TurnstileInstance {
	render: (container: string | HTMLElement, options: TurnstileOptions) => string;
	reset: (widgetId?: string) => void;
	getResponse: (widgetId?: string) => string | undefined;
	remove: (widgetId?: string) => void;
}

export interface GoogleCredentialResponse {
	credential: string;
}

export interface GoogleButtonOptions {
	theme?: 'outline' | 'filled_blue' | 'filled_black';
	size?: 'large' | 'medium' | 'small';
	width?: number;
	text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
}

export interface GoogleAccountsId {
	initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
	renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
	prompt: () => void;
	revoke?: (hint: string, callback: () => void) => void;
}

declare global {
	interface Window {
		turnstile?: TurnstileInstance;
		google?: { accounts?: { id?: GoogleAccountsId } };
	}
}
