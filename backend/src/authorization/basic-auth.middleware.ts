import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import auth from 'basic-auth';
import { Messages } from '../exceptions/text/messages.js';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: (err?: any, res?: any) => void): void {
    const basicAuthLogin = process.env.BASIC_AUTH_LOGIN;
    const basicAuthPassword = process.env.BASIC_AUTH_PWD;
    const userCredentials = auth(req);
    if (!userCredentials) {
      throw new UnauthorizedException(Messages.AUTHORIZATION_REQUIRED);
    }
    const { name: loginUserName, pass: loginUserPassword } = userCredentials;
    if (basicAuthLogin !== loginUserName || basicAuthPassword !== loginUserPassword) {
      throw new UnauthorizedException(Messages.INVALID_USERNAME_OR_PASSWORD);
    } else {
      next();
    }
  }
}
