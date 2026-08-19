import test from 'ava';
import SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import {
	EmailDispatchOutcome,
	EmailService,
	mapReminderOutcomeToCronResult,
} from '../../../src/entities/email/email/email.service.js';
import { EmailTransporterService } from '../../../src/entities/email/transporter/email-transporter-service.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { SaasEmailGatewayService } from '../../../src/microservices/gateways/saas-gateway.ts/saas-email-gateway.service.js';

function sentInfo(accepted: Array<string>, rejected: Array<string> = []): SMTPTransport.SentMessageInfo {
	return { messageId: '<mid-1>', accepted, rejected } as SMTPTransport.SentMessageInfo;
}

test('failed outcome -> result carries the reason', (t) => {
	const outcome: EmailDispatchOutcome = { ok: false, reason: 'http 404' };
	t.deepEqual(mapReminderOutcomeToCronResult('a@x.com', outcome), {
		email: 'a@x.com',
		failureReason: 'http 404',
	});
});

test('accepted delivery -> success row without failureReason', (t) => {
	const outcome: EmailDispatchOutcome = { ok: true, info: sentInfo(['a@x.com']) };
	const result = mapReminderOutcomeToCronResult('a@x.com', outcome);
	t.is(result.failureReason, undefined);
	t.is(result.messageId, '<mid-1>');
	t.deepEqual(result.accepted, ['a@x.com']);
});

test('saas best-effort rejection (empty accepted) -> failure, not a success row', (t) => {
	const outcome: EmailDispatchOutcome = { ok: true, info: sentInfo([], ['a@x.com']) };
	const result = mapReminderOutcomeToCronResult('a@x.com', outcome);
	t.is(result.failureReason, 'rejected by saas transporter');
});

test('saas rejection with delivery error detail -> detail appended to the reason', (t) => {
	const outcome: EmailDispatchOutcome = {
		ok: true,
		info: sentInfo([], ['a@x.com']),
		deliveryError: 'smtp auth failed',
	};
	const result = mapReminderOutcomeToCronResult('a@x.com', outcome);
	t.is(result.failureReason, 'rejected by saas transporter: smtp auth failed');
});

test('sendRemindersToUsers in test env -> every result names the suppression', async (t) => {
	const emailService = new EmailService(
		{} as unknown as EmailTransporterService,
		{} as unknown as SaasEmailGatewayService,
		{ error: () => {}, debug: () => {} } as unknown as WinstonLogger,
	);
	const results = await emailService.sendRemindersToUsers(['a@x.com', 'b@y.com']);
	t.deepEqual(results, [
		{ email: 'a@x.com', failureReason: 'suppressed: test env' },
		{ email: 'b@y.com', failureReason: 'suppressed: test env' },
	]);
});
