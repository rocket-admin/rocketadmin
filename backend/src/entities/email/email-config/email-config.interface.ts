export interface IEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: IAuth;
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
}

export interface IEmailConfigService {
  getEmailServiceConfig(): IEmailConfig | Promise<IEmailConfig>;
}

interface IAuth {
  user: string;
  pass: string;
}
