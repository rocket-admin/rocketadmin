import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Messages } from '../exceptions/text/messages.js';
import { extractTokenFromHeader } from './utils/extract-token-from-header.js';

@Injectable()
export class SaaSAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: (err?: any, res?: any) => void): void {
    console.log(`saas auth middleware triggered ->: ${new Date().toISOString()}`);
    const token = extractTokenFromHeader(req);
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }
    try {
      const jwtSecret = process.env.MICROSERVICE_JWT_SECRET;
      const data = jwt.verify(token, jwtSecret);
      const requestId = data['request_id'];

      if (!requestId) {
        throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
      }

      req['decoded'] = data;
      next();
    } catch (_e) {
      throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
    }
  }
}
