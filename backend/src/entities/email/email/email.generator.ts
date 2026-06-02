import { AbstractEmailLetter } from './abstract-email-letter.js';
import { IEmailGenerator, IMessage } from './email.interface.js';

export class EmailGenerator implements IEmailGenerator {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	generateEmail<TPayload extends {}>(email: AbstractEmailLetter<TPayload>): IMessage {
		return email.getEmail();
	}
}
