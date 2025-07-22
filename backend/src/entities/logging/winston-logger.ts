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

  public log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, ...optionalParams);
  }

  public error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
  }

  public warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, ...optionalParams);
  }

  public logWithSlack(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
    slackPostMessage(message).catch((error) => {
      this.logger.error('Failed to send Slack message', error);
    });
  }

  public printTechString(str: string): void {
    this.logger.info(`\n ${str} \n`);
  }

  public debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, ...optionalParams);
  }

  public verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, ...optionalParams);
  }

  public fatal(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
    slackPostMessage(message).catch((error) => {
      this.logger.error('Failed to send Slack message', error);
    });
  }
}
