import * as Sentry from '@sentry/node';
import axios from 'axios';
import { appConfig } from '../../shared/config/app-config.js';
import { Constants } from '../constants/constants.js';

export async function slackPostMessage(message: string, channel = Constants.DEFAULT_SLACK_CHANNEL): Promise<unknown> {
	try {
		const slackBotToken = appConfig.thirdParty.slackBotAccessToken;
		if (appConfig.isTest || !slackBotToken) {
			return;
		}
		const url = 'https://slack.com/api/chat.postMessage';
		const res = await axios.post(
			url,
			{
				channel: channel,
				text: message,
			},
			{ headers: { authorization: `Bearer ${slackBotToken}` } },
		);
		const data = res.data as { ok?: boolean; error?: string };
		if (data && data.ok === false) {
			// Slack accepted the HTTP call but refused the post (revoked token, unknown channel…).
			// Slack is the ops pager — it silently failing is itself an incident, so report through
			// the one channel that still works. Cannot use WinstonLogger here (it imports this helper).
			console.error(`slackPostMessage rejected by Slack API: ${data.error}`);
			Sentry.captureMessage(`slackPostMessage rejected by Slack API: ${data.error}`);
		}
		return res.data;
	} catch (e) {
		// Same reasoning as above: a broken alerting channel must not be invisible. Still swallowed —
		// posting must never affect the operation that triggered it.
		console.error('slackPostMessage failed:', e);
		Sentry.captureException(e);
		return;
	}
}
