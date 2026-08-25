import { EmailVerificationRequiredException } from '../../../exceptions/custom-exceptions/email-verification-required-exception.js';
import { TwoFaRequiredException } from '../../../exceptions/custom-exceptions/two-fa-required-exception.js';
import { JwtScopesEnum } from '../enums/jwt-scopes.enum.js';

// A scope on an end-user token means the session is restricted to the flow that finishes it:
// '2fa_enable' until the user enrols in company-mandated 2FA, 'email_verify' until the user
// confirms their email. Every auth path funnels through here so a restricted token is refused
// everywhere except the routes that complete its flow — those pass the scope in `allowScopes`.
//
// An unrecognized scope is ignored, preserving the behavior of the `includes(TWO_FA_ENABLE)`
// checks this replaced: a token minted by a newer service must not lock a user out of an older one.
export function assertTokenScopeAllowed(
	tokenScope: Array<JwtScopesEnum> | null | undefined,
	allowScopes: Array<JwtScopesEnum | string> = [],
): void {
	if (!tokenScope || tokenScope.length === 0) {
		return;
	}
	if (tokenScope.includes(JwtScopesEnum.TWO_FA_ENABLE) && !allowScopes.includes(JwtScopesEnum.TWO_FA_ENABLE)) {
		throw new TwoFaRequiredException();
	}
	if (tokenScope.includes(JwtScopesEnum.EMAIL_VERIFY) && !allowScopes.includes(JwtScopesEnum.EMAIL_VERIFY)) {
		throw new EmailVerificationRequiredException();
	}
}
