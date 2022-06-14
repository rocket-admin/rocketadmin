import { IEmailGenerator, IMessage } from './email.interface';
import { AbstractEmailLetter } from './abstract-email-letter';

export class EmailGenerator implements IEmailGenerator {
  generateEmail<TPayload>(email: AbstractEmailLetter<TPayload>): IMessage {
    return email.getEmail();
  }
}
