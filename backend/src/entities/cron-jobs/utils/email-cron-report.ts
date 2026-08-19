import { ICronMessagingResults } from '../../email/email/email.service.js';

const SUCCESS_TABLE_CHUNK_SIZE = 20;
const FAILURE_ADDRESSES_CHUNK_SIZE = 100;

// Pure formatter for the morning email-cron Slack report: one string per Slack
// message, in posting order. Successes render as fixed-width tables; failures
// are grouped by reason so a broken delivery seam names itself instead of
// hiding behind a generic "timed out" line.
export function buildEmailCronReportMessages(results: Array<ICronMessagingResults>): Array<string> {
	const successes = results.filter((result) => !result.failureReason);
	const failures = results.filter((result) => !!result.failureReason);

	const reasonGroups = new Map<string, Array<string>>();
	for (const failure of failures) {
		const reason = failure.failureReason as string;
		const group = reasonGroups.get(reason);
		if (group) {
			group.push(failure.email);
		} else {
			reasonGroups.set(reason, [failure.email]);
		}
	}

	const messages: Array<string> = [];

	if (results.length > 0 && failures.length === results.length && reasonGroups.size === 1) {
		const [onlyReason] = reasonGroups.keys();
		messages.push(
			`:warning: email delivery seam appears down (${onlyReason}) — transactional email is likely affected too`,
		);
	}

	for (let i = 0; i < successes.length; i += SUCCESS_TABLE_CHUNK_SIZE) {
		const chunk = successes.slice(i, i + SUCCESS_TABLE_CHUNK_SIZE);
		messages.push(successResultsToTable(chunk));
	}

	if (failures.length > 0) {
		messages.push(`Failed to send ${failures.length} of ${results.length} emails:`);
		for (const [reason, addresses] of reasonGroups) {
			if (addresses.length > FAILURE_ADDRESSES_CHUNK_SIZE) {
				for (let i = 0; i < addresses.length; i += FAILURE_ADDRESSES_CHUNK_SIZE) {
					const addressesChunk = addresses.slice(i, i + FAILURE_ADDRESSES_CHUNK_SIZE);
					messages.push(
						`${addresses.length} × ${reason} (chunk ${i / FAILURE_ADDRESSES_CHUNK_SIZE + 1}): ${addressesChunk.join(', ')}`,
					);
				}
			} else {
				messages.push(`${addresses.length} × ${reason} — ${addresses.join(', ')}`);
			}
		}
	}

	return messages;
}

function successResultsToTable(results: Array<ICronMessagingResults>): string {
	let output = '```\n';
	output += 'Idx | Accepted Email                  | Message ID\n';
	output += '----|---------------------------------|------------------------------------------\n';

	results.forEach((result, idx) => {
		const accepted = result.accepted && result.accepted.length > 0 ? result.accepted.join(', ') : result.email;
		const messageId = result.messageId ?? '-';
		const idxStr = String(idx + 1).padEnd(3);
		const acceptedStr = accepted.padEnd(32);
		output += `${idxStr} | ${acceptedStr} | ${messageId}\n`;
	});
	output += '```';
	return output;
}
