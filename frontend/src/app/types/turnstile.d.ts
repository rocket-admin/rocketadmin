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

declare global {
	interface Window {
		turnstile?: TurnstileInstance;
	}
}
