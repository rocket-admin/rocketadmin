import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, path: url } = request;
    const userAgent = request.get('user-agent') || '';

    this.logger.log(`START ${method} ${url} - ${userAgent} ${ip}`);
    response.on('close', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      this.logger.log(
        `method: ${method}, url: ${url}, statusCode: ${statusCode}, contentLength: ${contentLength}, userAgent: ${userAgent}, ip: ${ip}`,
      );
    });

    next();
  }
}
