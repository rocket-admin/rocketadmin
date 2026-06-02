import { AbstractEmailLetter } from './abstract-email-letter.js';

export interface IMessage {
	from: string;
	to: string;
	subject: string;
	text: string;
	html?: string;
}

export interface IEmailGenerator {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	generateEmail<TPayload extends {}>(email: AbstractEmailLetter<TPayload>): IMessage;
}
