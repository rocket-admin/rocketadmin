import winston from 'winston';

export const LoggerTransports = {
  default: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],
  debug: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.colorize({
          all: true,
          colors: { info: 'blue', error: 'red', warn: 'yellow', debug: 'cyan' },
        }),
        winston.format.printf(({ timestamp, level, message, context, trace }) => {
          const logContext = context ? ` [${context}]` : '';
          const logTrace = trace ? `\nTrace: ${trace}` : '';
          return `${timestamp} [${level}]${logContext}: ${message}${logTrace}`;
        }),
      ),
    }),
  ],
};
