import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { WinstonLogger } from '../../entities/logging/winston-logger.js';

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: WinstonLogger) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, path: url, baseUrl } = request;
    const userAgent = request.get('user-agent') || '';
    this.logger.log(`START ${method} ${url}${baseUrl} - ${userAgent} ${ip}`, { context: 'HTTP' });
    response.on('close', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      this.logger.log(
        `method: ${method}, url: ${url}, statusCode: ${statusCode}, contentLength: ${contentLength}, userAgent: ${userAgent}, ip: ${ip}`,
        { context: 'HTTP' },
      );
    });

    next();
  }
}
