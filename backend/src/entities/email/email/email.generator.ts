import { AbstractEmailLetter } from './abstract-email-letter.js';
import { IEmailGenerator, IMessage } from './email.interface.js';

export class EmailGenerator implements IEmailGenerator {
	generateEmail<TPayload>(email: AbstractEmailLetter<TPayload>): IMessage {
		return email.getEmail();
	}
}
