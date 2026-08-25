import { HttpStatus } from '@nestjs/common';
import test from 'ava';
import { JwtScopesEnum } from '../../../src/entities/user/enums/jwt-scopes.enum.js';
import { assertTokenScopeAllowed } from '../../../src/entities/user/utils/assert-token-scope-allowed.js';
import { ExceptionsInternalCodes } from '../../../src/exceptions/custom-exceptions/custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { EmailVerificationRequiredException } from '../../../src/exceptions/custom-exceptions/email-verification-required-exception.js';
import { TwoFaRequiredException } from '../../../src/exceptions/custom-exceptions/two-fa-required-exception.js';

// The single place every auth path asks "is this restricted token allowed here?".
// A scope on a token means the session is limited to the flow that finishes it —
// '2fa_enable' until the user enrols in 2FA, 'email_verify' until the user confirms
// their email — so it must be refused everywhere except the routes that complete it.

test('a token with no scope claim is allowed', (t) => {
	t.notThrows(() => assertTokenScopeAllowed(undefined));
	t.notThrows(() => assertTokenScopeAllowed(null));
	t.notThrows(() => assertTokenScopeAllowed([]));
});

test("'2fa_enable' is refused when the caller allows no scopes", (t) => {
	const error = t.throws(() => assertTokenScopeAllowed([JwtScopesEnum.TWO_FA_ENABLE]), {
		instanceOf: TwoFaRequiredException,
	});
	t.is(error.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(error.internalCode, ExceptionsInternalCodes.TWO_FA_REQUIRED);
});

test("'2fa_enable' is allowed when the caller allows it (2FA-enrolment routes)", (t) => {
	t.notThrows(() => assertTokenScopeAllowed([JwtScopesEnum.TWO_FA_ENABLE], [JwtScopesEnum.TWO_FA_ENABLE]));
});

test("'email_verify' is refused when the caller allows no scopes", (t) => {
	const error = t.throws(() => assertTokenScopeAllowed([JwtScopesEnum.EMAIL_VERIFY]), {
		instanceOf: EmailVerificationRequiredException,
	});
	t.is(error.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(error.internalCode, ExceptionsInternalCodes.EMAIL_VERIFICATION_REQUIRED);
});

test("'email_verify' is allowed when the caller allows it (the verify-code routes)", (t) => {
	t.notThrows(() => assertTokenScopeAllowed([JwtScopesEnum.EMAIL_VERIFY], [JwtScopesEnum.EMAIL_VERIFY]));
});

test('allowing one scope does not allow a different one', (t) => {
	t.throws(() => assertTokenScopeAllowed([JwtScopesEnum.EMAIL_VERIFY], [JwtScopesEnum.TWO_FA_ENABLE]), {
		instanceOf: EmailVerificationRequiredException,
	});
	t.throws(() => assertTokenScopeAllowed([JwtScopesEnum.TWO_FA_ENABLE], [JwtScopesEnum.EMAIL_VERIFY]), {
		instanceOf: TwoFaRequiredException,
	});
});

test('a token carrying both scopes is refused until both are allowed', (t) => {
	const scopes = [JwtScopesEnum.TWO_FA_ENABLE, JwtScopesEnum.EMAIL_VERIFY];
	t.throws(() => assertTokenScopeAllowed(scopes, [JwtScopesEnum.TWO_FA_ENABLE]), {
		instanceOf: EmailVerificationRequiredException,
	});
	t.notThrows(() => assertTokenScopeAllowed(scopes, scopes));
});

// Forward compatibility: an unrecognized scope keeps the pre-existing behavior of
// every call site (the old `includes(TWO_FA_ENABLE)` check ignored anything else),
// so a token minted by a newer service never locks a user out of an older one.
test('an unrecognized scope is ignored', (t) => {
	t.notThrows(() => assertTokenScopeAllowed(['some_future_scope' as JwtScopesEnum]));
});
