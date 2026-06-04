import { HttpException, HttpStatus } from '@nestjs/common';
import test from 'ava';
import { ExceptionsInternalCodes } from '../../../src/exceptions/custom-exceptions/custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { MasterPasswordIncorrectException } from '../../../src/exceptions/custom-exceptions/master-password-incorrect-exception.js';
import { MasterPasswordMissingException } from '../../../src/exceptions/custom-exceptions/master-password-missing-exception.js';
import {
	MasterPasswordIncorrectError,
	MasterPasswordMissingError,
} from '../../../src/exceptions/domain-errors/master-password.errors.js';
import { translateDomainError } from '../../../src/exceptions/domain-errors/translate-domain-error.js';
import { Messages } from '../../../src/exceptions/text/messages.js';

test('domain errors are plain Errors with no HTTP coupling', (t) => {
	const missing = new MasterPasswordMissingError();
	t.true(missing instanceof Error);
	t.false(missing instanceof HttpException, 'data-layer error must not be an HttpException');
	t.is(missing.message, Messages.MASTER_PASSWORD_MISSING, 'message mirrors the constant for legacy string checks');
	t.is(missing.name, 'MasterPasswordMissingError');
});

test('translateDomainError: MasterPasswordMissingError -> 400 + code 1200 + type no_master_key', (t) => {
	const http = translateDomainError(new MasterPasswordMissingError());
	t.true(http instanceof MasterPasswordMissingException);
	t.is(http?.getStatus(), HttpStatus.BAD_REQUEST);
	t.is((http as MasterPasswordMissingException).internalCode, ExceptionsInternalCodes.MASTER_PASSWORD_MISSING);
	t.is((http as MasterPasswordMissingException).type, 'no_master_key');
});

test('translateDomainError: MasterPasswordIncorrectError -> 400 + code 1201 + type invalid_master_key', (t) => {
	const http = translateDomainError(new MasterPasswordIncorrectError());
	t.true(http instanceof MasterPasswordIncorrectException);
	t.is(http?.getStatus(), HttpStatus.BAD_REQUEST);
	t.is((http as MasterPasswordIncorrectException).internalCode, ExceptionsInternalCodes.MASTER_PASSWORD_INCORRECT);
	t.is((http as MasterPasswordIncorrectException).type, 'invalid_master_key');
});

test('translateDomainError: returns null for anything that is not a known domain error', (t) => {
	t.is(translateDomainError(new Error('something else')), null);
	t.is(translateDomainError('a string'), null);
	t.is(translateDomainError(undefined), null);
	t.is(translateDomainError({ message: 'plain object' }), null);
});
