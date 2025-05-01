import { AbstractEmailLetter } from './abstract-email-letter.js';

export interface IMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailGenerator {
  generateEmail<TPayload>(email: AbstractEmailLetter<TPayload>): IMessage;
}

