import winston from 'winston';

export class Logger {
  private static readonly infoLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  private static readonly errorLogger = winston.createLogger({
    level: 'error',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  public static logInfo(log_object: Record<string, unknown>): void {
    this.infoLogger.info(log_object);
  }

  public static logError(log_object: Record<string, unknown>): void {
    this.errorLogger.info(log_object);
  }
}
