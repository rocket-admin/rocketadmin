// Google Identity Services sign-in (LoginComponent.ngAfterViewInit): initialise GSI with the
// Rocketadmin client id, render the "Continue with Google" button into a container and show One Tap.
// The GSI client script is loaded by index.saas.html, so this is SaaS-only.
//
//   const google = useGoogleSignIn();
//   onMounted(() => google.mount(buttonEl.value, (credential) => auth.loginWithGoogle(credential)));
import type { GoogleAccountsId } from '@/types/third-party-auth';

export const GOOGLE_CLIENT_ID = '681163285738-e4l0lrv5vv7m616ucrfhnhso9r396lum.apps.googleusercontent.com';

function googleAccountsId(): GoogleAccountsId | undefined {
	return window.google?.accounts?.id;
}

export function useGoogleSignIn() {
	/**
	 * Renders the button into `container` and prompts One Tap. `onCredential` gets the ID token of
	 * the account the user picked. Returns false when the GSI script is not available.
	 */
	function mount(container: HTMLElement | null | undefined, onCredential: (credential: string) => void): boolean {
		const accountsId = googleAccountsId();
		if (!accountsId || !container) return false;
		accountsId.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: (response) => onCredential(response.credential),
		});
		accountsId.renderButton(container, { theme: 'outline', size: 'large', width: 360, text: 'continue_with' });
		accountsId.prompt();
		return true;
	}

	return { mount };
}
