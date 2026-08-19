import test from 'ava';
import { buildEmailCronReportMessages } from '../../../src/entities/cron-jobs/utils/email-cron-report.js';
import { ICronMessagingResults } from '../../../src/entities/email/email/email.service.js';

function success(email: string, messageId = `<id-${email}>`): ICronMessagingResults {
	return { email, messageId, accepted: [email], rejected: [] };
}

function failure(email: string, failureReason: string): ICronMessagingResults {
	return { email, failureReason };
}

test('all successes -> one table message, no failure lines, no banner', (t) => {
	const messages = buildEmailCronReportMessages([success('a@x.com'), success('b@y.com')]);
	t.is(messages.length, 1);
	t.true(messages[0].includes('a@x.com'));
	t.true(messages[0].includes('<id-b@y.com>'));
	t.false(messages.some((m) => m.includes('Failed to send')));
	t.false(messages.some((m) => m.includes('seam appears down')));
});

test('successes are chunked into tables of 20', (t) => {
	const results = Array.from({ length: 45 }, (_, i) => success(`user${i}@x.com`));
	const messages = buildEmailCronReportMessages(results);
	const tables = messages.filter((m) => m.startsWith('```'));
	t.is(tables.length, 3);
});

test('failures are grouped by reason with matching count and address list', (t) => {
	const messages = buildEmailCronReportMessages([
		success('ok@x.com'),
		failure('a@x.com', 'http 404'),
		failure('b@x.com', 'http 404'),
		failure('c@x.com', 'fetch failed: ECONNREFUSED'),
	]);
	t.true(messages.some((m) => m === 'Failed to send 3 of 4 emails:'));
	const notFoundLine = messages.find((m) => m.startsWith('2 × http 404'));
	t.truthy(notFoundLine);
	t.true((notFoundLine as string).includes('a@x.com, b@x.com'));
	t.true(messages.some((m) => m === '1 × fetch failed: ECONNREFUSED — c@x.com'));
	// a mixed run with successes present must not raise the seam-down banner
	t.false(messages.some((m) => m.includes('seam appears down')));
});

test('all failed with a single reason -> seam-down banner leads the report', (t) => {
	const messages = buildEmailCronReportMessages([
		failure('a@x.com', 'suppressed: not SaaS'),
		failure('b@x.com', 'suppressed: not SaaS'),
	]);
	t.true(messages[0].includes('email delivery seam appears down (suppressed: not SaaS)'));
	t.true(messages[0].includes('transactional email is likely affected too'));
	t.true(messages.some((m) => m === 'Failed to send 2 of 2 emails:'));
});

test('all failed with mixed reasons -> no banner', (t) => {
	const messages = buildEmailCronReportMessages([
		failure('a@x.com', 'http 404'),
		failure('b@x.com', 'timed out after 4000ms'),
	]);
	t.false(messages.some((m) => m.includes('seam appears down')));
	t.true(messages.some((m) => m === 'Failed to send 2 of 2 emails:'));
});

test('failure groups larger than 100 addresses are chunked', (t) => {
	const results = Array.from({ length: 120 }, (_, i) => failure(`user${i}@x.com`, 'http 401'));
	const messages = buildEmailCronReportMessages(results);
	const chunk1 = messages.find((m) => m.startsWith('120 × http 401 (chunk 1):'));
	const chunk2 = messages.find((m) => m.startsWith('120 × http 401 (chunk 2):'));
	t.truthy(chunk1);
	t.truthy(chunk2);
	t.is((chunk1 as string).split('@x.com').length - 1, 100);
	t.is((chunk2 as string).split('@x.com').length - 1, 20);
});

test('empty input -> no messages', (t) => {
	t.deepEqual(buildEmailCronReportMessages([]), []);
});
