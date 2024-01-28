import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Logger } from '../../helpers/logging/Logger.js';

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, path: url } = request;
    const userAgent = request.get('user-agent') || '';
    Logger.logInfoString(`START ${method} ${url} - ${userAgent} ${ip}`);
    response.on('close', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      Logger.logInfoString(
        `method: ${method}, url: ${url}, statusCode: ${statusCode}, contentLength: ${contentLength}, userAgent: ${userAgent}, ip: ${ip}`,
      );
    });

    next();
  }
}
