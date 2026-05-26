import axios from 'axios';
import { appConfig } from '../../shared/config/app-config.js';
import { Constants } from '../constants/constants.js';

export async function slackPostMessage(message: string, channel = Constants.DEFAULT_SLACK_CHANNEL): Promise<any> {
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
		return res.data;
	} catch (_e) {
		return;
	}
}
