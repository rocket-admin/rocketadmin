import axios from 'axios';

export async function actionSlackPostMessage(message: string, channel: string, slackBotToken: string): Promise<void> {
  try {
    if (!slackBotToken || !channel || !message) {
      return;
    }
    const url = 'https://slack.com/api/chat.postMessage';
    await axios.post(
      url,
      {
        channel: channel,
        text: message,
      },
      { headers: { authorization: `Bearer ${slackBotToken}` } },
    );
  } catch (error) {
    throw error;
  }
}
