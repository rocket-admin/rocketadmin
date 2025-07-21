import { Injectable, LoggerService } from '@nestjs/common';
import winston from 'winston';
import { slackPostMessage } from '../../helpers/index.js';
import { LoggerTransports } from './logger-transports.config.js';

@Injectable()
export class WinstonLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      transports: LoggerTransports.default,
    });
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, ...optionalParams);
  }

  logWithSlack(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
    slackPostMessage(message).catch((error) => {
      this.logger.error('Failed to send Slack message', error);
    });
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, ...optionalParams);
  }

  fatal(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
    slackPostMessage(message).catch((error) => {
      this.logger.error('Failed to send Slack message', error);
    });
  }
}
