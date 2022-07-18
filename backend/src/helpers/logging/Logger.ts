import * as winston from 'winston';

export class Logger {
  private static readonly logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  public static log(log_object: Record<string, unknown>): void {
    this.logger.info(log_object);
  }
}
