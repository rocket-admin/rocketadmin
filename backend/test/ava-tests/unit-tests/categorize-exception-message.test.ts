import test from 'ava';
import { ExceptionsInternalCodes } from '../../../src/exceptions/custom-exceptions/custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ExceptionType } from '../../../src/exceptions/custom-exceptions/exception-type.js';
import {
	categorizeExceptionMessage,
	processExceptionMessage,
} from '../../../src/exceptions/utils/process-exception-message.js';

interface Case {
	name: string;
	raw: string;
	code: ExceptionsInternalCodes;
	type: ExceptionType;
}

const CASES: Array<Case> = [
	{
		name: 'AWS host + timeout -> host unreachable',
		raw: 'connect ETIMEDOUT mydb.abcdef.us-east-1.rds.amazonaws.com:5432',
		code: ExceptionsInternalCodes.HOST_UNREACHABLE,
		type: 'host_unreachable',
	},
	{
		name: 'plain timeout -> connection timeout',
		raw: 'connect ETIMEDOUT 10.0.0.5:5432',
		code: ExceptionsInternalCodes.CONNECTION_TIMEOUT,
		type: 'query_timeout',
	},
	{
		name: 'getaddrinfo ENOTFOUND -> host unreachable',
		raw: 'getaddrinfo ENOTFOUND nonexistent.host',
		code: ExceptionsInternalCodes.HOST_UNREACHABLE,
		type: 'host_unreachable',
	},
	{
		name: 'ECONNREFUSED -> host unreachable',
		raw: 'connect ECONNREFUSED 127.0.0.1:5432',
		code: ExceptionsInternalCodes.HOST_UNREACHABLE,
		type: 'host_unreachable',
	},
	{
		name: 'ORA-02292 -> foreign key violation',
		raw: 'ORA-02292: integrity constraint (SCHEMA.FK_CHILD) violated - child record found',
		code: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
		type: 'foreign_key_violation',
	},
	{
		name: 'no pg_hba.conf entry -> db permission denied',
		raw: 'no pg_hba.conf entry for host "1.2.3.4", user "u", database "d", no encryption',
		code: ExceptionsInternalCodes.DB_PERMISSION_DENIED,
		type: 'db_permission_denied',
	},
	{
		name: 'UPDATE command denied -> db permission denied',
		raw: "UPDATE command denied to user 'reader'@'%' for table 'orders'",
		code: ExceptionsInternalCodes.DB_PERMISSION_DENIED,
		type: 'db_permission_denied',
	},
	{
		name: 'PG foreign key constraint -> foreign key violation',
		raw: 'update or delete on table "parent" violates foreign key constraint "fk_child" on table "child"',
		code: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
		type: 'foreign_key_violation',
	},
	{
		name: 'MySQL parent row -> foreign key violation',
		raw: 'Cannot delete or update a parent row: a foreign key constraint fails (`db`.`child`, CONSTRAINT `fk` FOREIGN KEY (`pid`) REFERENCES `parent` (`id`))',
		code: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
		type: 'foreign_key_violation',
	},
	{
		name: 'MSSQL reference constraint -> foreign key violation',
		raw: 'The DELETE statement conflicted with the REFERENCE constraint "FK_child". The conflict occurred in database "d", table "dbo.child"',
		code: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
		type: 'foreign_key_violation',
	},
	{
		name: 'MySQL SELECT denied -> db permission denied',
		raw: "SELECT command denied to user 'reader'@'%' for table 'secrets'",
		code: ExceptionsInternalCodes.DB_PERMISSION_DENIED,
		type: 'db_permission_denied',
	},
	{
		name: 'malformed utf-8 -> decryption failed',
		raw: 'Malformed UTF-8 data',
		code: ExceptionsInternalCodes.DECRYPTION_FAILED,
		type: 'decryption_failed',
	},
];

for (const c of CASES) {
	test(`categorizeExceptionMessage: ${c.name}`, (t) => {
		const result = categorizeExceptionMessage(c.raw);
		t.is(result.internalCode, c.code, 'internalCode should match the category');
		t.is(result.type, c.type, 'type should match the category');
		t.truthy(result.message, 'a user-facing message should be present');
	});
}

test('categorizeExceptionMessage: unknown error returns the original message with no code/type', (t) => {
	const raw = 'some completely unrecognized driver error xyz';
	const result = categorizeExceptionMessage(raw);
	t.is(result.message, raw);
	t.is(result.internalCode, undefined);
	t.is(result.type, undefined);
});

test('categorizeExceptionMessage: matching is case-insensitive', (t) => {
	const upper = categorizeExceptionMessage('GETADDRINFO ENOTFOUND SOME.HOST');
	t.is(upper.internalCode, ExceptionsInternalCodes.HOST_UNREACHABLE);
	t.is(upper.type, 'host_unreachable');
});

test('processExceptionMessage: returns only the (possibly rewritten) message string', (t) => {
	const friendly = processExceptionMessage('getaddrinfo ENOTFOUND nope.host');
	t.is(typeof friendly, 'string');
	t.true(friendly.length > 0);
	// unrecognized input passes through unchanged
	t.is(processExceptionMessage('totally unknown'), 'totally unknown');
});
