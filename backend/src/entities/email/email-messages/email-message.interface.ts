export interface IEmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}
