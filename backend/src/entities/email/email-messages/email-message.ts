import { AbstractEmailLetter } from '../email/abstract-email-letter';
import { IEmailMessage } from './email-message.interface';
import { IMessage } from '../email/email.interface';

export class EmailLetter extends AbstractEmailLetter<IEmailMessage> {
  constructor(params: IEmailMessage) {
    super(params);
  }

  getEmail(): IMessage {
    return {
      from: this._params.from,
      to: this._params.to,
      subject: this._params.subject,
      text: this._params.text,
      html: this._params.html,
    };
  }
}
