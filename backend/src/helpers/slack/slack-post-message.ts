import axios from 'axios';
import { Constants } from '../constants/constants';

export async function slackPostMessage(message: string, channel = Constants.DEFAULT_SLACK_CHANNEL): Promise<any> {
  try {
    const slackBotToken = process.env.SLACK_BOT_ACCESS_TOKEN;
    if (process.env.NODE_ENV === 'test' || !slackBotToken) {
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
  } catch (e) {
    return;
  }
}
