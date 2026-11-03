import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GoogleAccountsId, GoogleCredentialResponse } from '@/types/third-party-auth';
import { GOOGLE_CLIENT_ID, useGoogleSignIn } from './useGoogleSignIn';

function installGoogle() {
	let callback: ((response: GoogleCredentialResponse) => void) | undefined;
	const id = {
		initialize: vi.fn((options: Parameters<GoogleAccountsId['initialize']>[0]) => {
			callback = options.callback;
		}),
		renderButton: vi.fn(),
		prompt: vi.fn(),
	};
	window.google = { accounts: { id } };
	return { id, credential: (value: string) => callback?.({ credential: value }) };
}

describe('useGoogleSignIn', () => {
	afterEach(() => {
		delete window.google;
	});

	it('initialises GSI, renders the button and prompts One Tap', () => {
		const { id, credential } = installGoogle();
		const container = document.createElement('div');
		const onCredential = vi.fn();

		expect(useGoogleSignIn().mount(container, onCredential)).toBe(true);

		expect(id.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: GOOGLE_CLIENT_ID }));
		expect(id.renderButton).toHaveBeenCalledWith(container, {
			theme: 'outline',
			size: 'large',
			width: 360,
			text: 'continue_with',
		});
		expect(id.prompt).toHaveBeenCalled();

		credential('id-token');
		expect(onCredential).toHaveBeenCalledWith('id-token');
	});

	it('does nothing without the GSI script or a container', () => {
		expect(useGoogleSignIn().mount(document.createElement('div'), vi.fn())).toBe(false);

		const { id } = installGoogle();
		expect(useGoogleSignIn().mount(null, vi.fn())).toBe(false);
		expect(id.initialize).not.toHaveBeenCalled();
	});
});
