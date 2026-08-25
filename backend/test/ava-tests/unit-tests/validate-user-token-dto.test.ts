import test from 'ava';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { JwtScopesEnum } from '../../../src/entities/user/enums/jwt-scopes.enum.js';
import { ValidateUserTokenDto } from '../../../src/microservices/agents-microservice/dto/agents-auth.dtos.js';

// `allowScopes` is enum-validated, which makes this DTO a CROSS-REPO CONTRACT: a satellite that
// asks to accept a scope this core has never heard of gets a 400 from the ValidationPipe before
// any handler runs. That is the correct failure — a core that cannot name a scope cannot enforce
// it either — but it means every scope a satellite may send has to exist here first.
//
// This exact break cost a CI run: rocketadmin-saas' email-verification middleware sent
// 'email_verify' and every request through it 400'd.

function errorsFor(body: Record<string, unknown>): Array<string> {
	return validateSync(plainToInstance(ValidateUserTokenDto, body)).flatMap((e) => Object.values(e.constraints ?? {}));
}

test('accepts a token on its own (the strict case)', (t) => {
	t.deepEqual(errorsFor({ token: 'a-jwt' }), []);
});

test("accepts allowScopes: ['2fa_enable'] — the OTP-enrolment routes", (t) => {
	t.deepEqual(errorsFor({ token: 'a-jwt', allowScopes: [JwtScopesEnum.TWO_FA_ENABLE] }), []);
});

test("accepts allowScopes: ['email_verify'] — the email-confirmation routes", (t) => {
	t.deepEqual(errorsFor({ token: 'a-jwt', allowScopes: ['email_verify'] }), []);
});

test('accepts every scope this core defines, so no satellite can be refused a scope we enforce', (t) => {
	t.deepEqual(errorsFor({ token: 'a-jwt', allowScopes: Object.values(JwtScopesEnum) }), []);
});

test('refuses a scope this core does not know', (t) => {
	// Deliberate: accepting it would let a caller wave through a restriction we cannot apply.
	t.true(errorsFor({ token: 'a-jwt', allowScopes: ['not_a_scope'] }).length > 0);
});

test('refuses a missing token and a non-array allowScopes', (t) => {
	t.true(errorsFor({}).length > 0);
	t.true(errorsFor({ token: 'a-jwt', allowScopes: 'email_verify' }).length > 0);
});
