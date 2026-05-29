import { Injectable, LoggerService } from '@nestjs/common';
import winston from 'winston';
import { slackPostMessage } from '../../helpers/slack/slack-post-message.js';
import { appConfig } from '../../shared/config/app-config.js';
import { LoggerTransports } from './logger-transports.config.js';

function formatMessage(message: unknown): string {
	if (typeof message === 'string') {
		return message;
	}
	if (message instanceof Error) {
		return message.stack ?? message.message;
	}
	try {
		return JSON.stringify(message);
	} catch {
		return String(message);
	}
}

@Injectable()
export class WinstonLogger implements LoggerService {
	private readonly logger: winston.Logger;

	constructor() {
		this.logger = winston.createLogger({
			level: appConfig.app.logLevel,
			transports: LoggerTransports.default,
		});
	}

	public log(message: unknown, ...optionalParams: unknown[]): void {
		this.logger.info(formatMessage(message), ...optionalParams);
	}

	public info(message: unknown, ...optionalParams: unknown[]): void {
		this.logger.info(formatMessage(message), ...optionalParams);
	}

	public error(message: unknown, ...optionalParams: unknown[]): void {
		this.logger.error(formatMessage(message), ...optionalParams);
	}

	public warn(message: unknown, ...optionalParams: unknown[]): void {
		this.logger.warn(formatMessage(message), ...optionalParams);
	}

	public logWithSlack(message: unknown, ...optionalParams: unknown[]): void {
		const formatted = formatMessage(message);
		this.logger.error(formatted, ...optionalParams);
		slackPostMessage(formatted).catch((error) => {
			this.logger.error('Failed to send Slack message', error);
		});
	}

	public printTechString(str: string): void {
		this.logger.info(`\n ${str} \n`);
	}

	public debug(message: unknown, ...optionalParams: unknown[]): void {
		this.logger.debug(formatMessage(message), ...optionalParams);
	}

	public verbose(message: unknown, ...optionalParams: unknown[]): void {
		this.logger.verbose(formatMessage(message), ...optionalParams);
	}

	public fatal(message: unknown, ...optionalParams: unknown[]): void {
		const formatted = formatMessage(message);
		this.logger.error(formatted, ...optionalParams);
		slackPostMessage(formatted).catch((error) => {
			this.logger.error('Failed to send Slack message', error);
		});
	}
}
