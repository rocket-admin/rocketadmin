import { HttpStatus } from '@nestjs/common';
import test from 'ava';
import { ValidationError } from 'class-validator';
import { ConnectionNotFoundException } from '../../../src/exceptions/custom-exceptions/connection-not-found-exception.js';
import { ExceptionsInternalCodes } from '../../../src/exceptions/custom-exceptions/custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { DeleteRowException } from '../../../src/exceptions/custom-exceptions/delete-row-exception.js';
import { ExternalServiceException } from '../../../src/exceptions/custom-exceptions/external-service-exception.js';
import { MasterPasswordIncorrectException } from '../../../src/exceptions/custom-exceptions/master-password-incorrect-exception.js';
import { MasterPasswordMissingException } from '../../../src/exceptions/custom-exceptions/master-password-missing-exception.js';
import { ErrorsMessages } from '../../../src/exceptions/custom-exceptions/messages/custom-errors-messages.js';
import { NonAvailableInFreePlanException } from '../../../src/exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { PrimaryKeyMissingException } from '../../../src/exceptions/custom-exceptions/primary-key-missing-exception.js';
import { TableNotFoundException } from '../../../src/exceptions/custom-exceptions/table-not-found-exception.js';
import { TwoFaRequiredException } from '../../../src/exceptions/custom-exceptions/two-fa-required-exception.js';
import { UnknownSQLException } from '../../../src/exceptions/custom-exceptions/unknown-sql-exception.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';

const FK_RAW = 'update or delete on table "parent" violates foreign key constraint "fk" on table "child"';

test('UnknownSQLException: recognized SQL error gets specific code/type and keeps originalMessage', (t) => {
	const exc = new UnknownSQLException(FK_RAW, 'Failed to get rows from table.');
	t.is(exc.getStatus(), HttpStatus.INTERNAL_SERVER_ERROR);
	t.is(exc.internalCode, ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION);
	t.is(exc.type, 'foreign_key_violation');
	t.is(exc.originalMessage, FK_RAW);
	t.true(exc.message.startsWith('Failed to get rows from table.'), 'operation prefix is preserved');
});

test('UnknownSQLException: unrecognized error falls back to generic message + UNKNOWN_SQL_EXCEPTION', (t) => {
	const raw = 'some weird driver failure';
	const exc = new UnknownSQLException(raw);
	t.is(exc.internalCode, ExceptionsInternalCodes.UNKNOWN_SQL_EXCEPTION);
	t.is(exc.type, undefined);
	t.is(exc.originalMessage, raw);
	t.true(exc.message.length > 0);
});

test('UnknownSQLException: agent no-data maps to AGENT_NO_DATA', (t) => {
	const exc = new UnknownSQLException('No data returned from agent');
	t.is(exc.internalCode, ExceptionsInternalCodes.AGENT_NO_DATA);
	t.is(exc.originalMessage, 'No data returned from agent');
});

test('DeleteRowException: FK error surfaces specific code; unknown falls back', (t) => {
	const fk = new DeleteRowException(FK_RAW);
	t.is(fk.internalCode, ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION);
	t.is(fk.type, 'foreign_key_violation');
	t.is(fk.originalMessage, FK_RAW);

	const unknown = new DeleteRowException('weird failure');
	t.is(unknown.internalCode, ExceptionsInternalCodes.UNKNOWN_SQL_EXCEPTION);
	t.is(unknown.message, ErrorsMessages.FAILED_TO_DELETE_ROW);
	t.is(unknown.getStatus(), HttpStatus.INTERNAL_SERVER_ERROR);
});

test('ConnectionNotFoundException: defaults to 404 and preserves an explicit status', (t) => {
	const def = new ConnectionNotFoundException();
	t.is(def.getStatus(), HttpStatus.NOT_FOUND);
	t.is(def.internalCode, ExceptionsInternalCodes.CONNECTION_NOT_FOUND);
	t.is(def.message, Messages.CONNECTION_NOT_FOUND);

	const badReq = new ConnectionNotFoundException(HttpStatus.BAD_REQUEST);
	t.is(badReq.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(badReq.internalCode, ExceptionsInternalCodes.CONNECTION_NOT_FOUND);
});

test('MasterPasswordMissingException: 400 + code 1200 + type no_master_key', (t) => {
	const exc = new MasterPasswordMissingException();
	t.is(exc.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(exc.internalCode, ExceptionsInternalCodes.MASTER_PASSWORD_MISSING);
	t.is(exc.type, 'no_master_key');
	t.is(exc.message, Messages.MASTER_PASSWORD_MISSING);
});

test('MasterPasswordIncorrectException: 400 + code 1201 + type invalid_master_key', (t) => {
	const exc = new MasterPasswordIncorrectException();
	t.is(exc.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(exc.internalCode, ExceptionsInternalCodes.MASTER_PASSWORD_INCORRECT);
	t.is(exc.type, 'invalid_master_key');
});

test('TwoFaRequiredException: 400 + code 1202', (t) => {
	const exc = new TwoFaRequiredException();
	t.is(exc.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(exc.internalCode, ExceptionsInternalCodes.TWO_FA_REQUIRED);
	t.is(exc.message, Messages.TWO_FA_REQUIRED);
});

test('PrimaryKeyMissingException: 400 + code 1101, default and custom message', (t) => {
	const def = new PrimaryKeyMissingException();
	t.is(def.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(def.internalCode, ExceptionsInternalCodes.PRIMARY_KEY_MISSING);
	t.is(def.message, Messages.PRIMARY_KEY_MISSING);

	const custom = new PrimaryKeyMissingException('custom pk message');
	t.is(custom.message, 'custom pk message');
	t.is(custom.internalCode, ExceptionsInternalCodes.PRIMARY_KEY_MISSING);
});

test('TableNotFoundException: 400 + code 1301', (t) => {
	const exc = new TableNotFoundException();
	t.is(exc.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(exc.internalCode, ExceptionsInternalCodes.TABLE_NOT_FOUND);
	t.is(exc.message, Messages.TABLE_NOT_FOUND);
});

test('ValidationException: string message and array formatting, code 1007', (t) => {
	const strExc = new ValidationException('bad input');
	t.is(strExc.getStatus(), HttpStatus.BAD_REQUEST);
	t.is(strExc.internalCode, ExceptionsInternalCodes.VALIDATOR_EXCEPTION);
	t.is(strExc.message, 'bad input');

	const errors = [
		{ property: 'email', constraints: { isEmail: 'email must be valid' } },
	] as unknown as ValidationError[];
	const arrExc = new ValidationException(errors);
	t.is(arrExc.internalCode, ExceptionsInternalCodes.VALIDATOR_EXCEPTION);
	t.true(arrExc.message.includes('email'), 'formatted message mentions the property');
	t.true(arrExc.message.includes('email must be valid'), 'formatted message includes the constraint text');
});

test('NonAvailableInFreePlanException: 402 + code 1400', (t) => {
	const exc = new NonAvailableInFreePlanException();
	t.is(exc.getStatus(), HttpStatus.PAYMENT_REQUIRED);
	t.is(exc.internalCode, ExceptionsInternalCodes.FEATURE_NON_AVAILABLE_IN_FREE_PLAN);
});

test('ExternalServiceException: preserves upstream status and originalMessage, code 1500', (t) => {
	const exc = new ExternalServiceException(
		Messages.SAAS_DELETE_COMPANY_FAILED_UNHANDLED_ERROR,
		503,
		'upstream blew up',
	);
	t.is(exc.getStatus(), 503);
	t.is(exc.internalCode, ExceptionsInternalCodes.EXTERNAL_SERVICE_ERROR);
	t.is(exc.originalMessage, 'upstream blew up');
	t.is(exc.message, Messages.SAAS_DELETE_COMPANY_FAILED_UNHANDLED_ERROR);
});
