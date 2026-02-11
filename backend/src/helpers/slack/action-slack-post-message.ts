import axios from 'axios';

export async function actionSlackPostMessage(message: string, slack_url: string): Promise<void> {
	if (!slack_url || !message) {
		return;
	}
	await axios.post(slack_url, { text: message });
}
