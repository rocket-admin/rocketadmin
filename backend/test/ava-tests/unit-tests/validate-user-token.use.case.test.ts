import test from 'ava';
import jwt from 'jsonwebtoken';
import { IGlobalDatabaseContext } from '../../../src/common/application/global-database-context.interface.js';
import { JwtScopesEnum } from '../../../src/entities/user/enums/jwt-scopes.enum.js';
import { InTransactionEnum } from '../../../src/enums/in-transaction.enum.js';
import { EmailVerificationRequiredException } from '../../../src/exceptions/custom-exceptions/email-verification-required-exception.js';
import { TwoFaRequiredException } from '../../../src/exceptions/custom-exceptions/two-fa-required-exception.js';
import { ValidateUserTokenUseCase } from '../../../src/microservices/agents-microservice/use-cases/validate-user-token.use.case.js';
import { appConfig } from '../../../src/shared/config/app-config.js';

// The satellite services (rocketadmin-saas, agents-core) validate end-user cookies through this
// use case. `allowScopes` is how a caller says "this route is the one that finishes the restricted
// flow" — without it a scoped token must be refused, which is what makes the email-verification
// gate real rather than cosmetic.

const USER_ID = 'a3f1c9d2-4b5e-4c7a-8d9e-0f1a2b3c4d5e';

function makeUseCase(): ValidateUserTokenUseCase {
	const dbContext = {
		logOutRepository: { isLoggedOut: async () => false },
		userRepository: { findOneUserById: async () => ({ id: USER_ID, suspended: false }) },
	} as unknown as IGlobalDatabaseContext;
	return new ValidateUserTokenUseCase(dbContext);
}

function signToken(scope?: Array<JwtScopesEnum>): string {
	return jwt.sign({ id: USER_ID, email: 'user@example.com', scope }, appConfig.auth.jwtSecret, { expiresIn: '1h' });
}

test('an unscoped token validates and returns the identity', async (t) => {
	const result = await makeUseCase().execute({ token: signToken() }, InTransactionEnum.OFF);
	t.is(result.sub, USER_ID);
	t.is(result.email, 'user@example.com');
});

test("an 'email_verify' token is refused when the caller allows no scopes", async (t) => {
	await t.throwsAsync(
		makeUseCase().execute({ token: signToken([JwtScopesEnum.EMAIL_VERIFY]) }, InTransactionEnum.OFF),
		{
			instanceOf: EmailVerificationRequiredException,
		},
	);
});

test("an 'email_verify' token validates when the caller allows that scope", async (t) => {
	const result = await makeUseCase().execute(
		{ token: signToken([JwtScopesEnum.EMAIL_VERIFY]), allowScopes: [JwtScopesEnum.EMAIL_VERIFY] },
		InTransactionEnum.OFF,
	);
	t.is(result.sub, USER_ID);
});

test("a '2fa_enable' token is still refused by default and accepted when allowed", async (t) => {
	await t.throwsAsync(
		makeUseCase().execute({ token: signToken([JwtScopesEnum.TWO_FA_ENABLE]) }, InTransactionEnum.OFF),
		{ instanceOf: TwoFaRequiredException },
	);
	const result = await makeUseCase().execute(
		{ token: signToken([JwtScopesEnum.TWO_FA_ENABLE]), allowScopes: [JwtScopesEnum.TWO_FA_ENABLE] },
		InTransactionEnum.OFF,
	);
	t.is(result.sub, USER_ID);
});
