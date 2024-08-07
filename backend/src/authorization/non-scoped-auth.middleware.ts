import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { LogOutEntity } from '../entities/log-out/log-out.entity.js';
import { Messages } from '../exceptions/text/messages.js';
import { isObjectEmpty } from '../helpers/index.js';
import { Constants } from '../helpers/constants/constants.js';
import Sentry from '@sentry/minimal';

@Injectable()
export class NonScopedAuthMiddleware implements NestMiddleware {
  public constructor(
    @InjectRepository(LogOutEntity)
    private readonly logOutRepository: Repository<LogOutEntity>,
  ) {}
  async use(req: Request, res: Response, next: (err?: any, res?: any) => void): Promise<void> {
    console.log(`auth middleware triggered ->: ${new Date().toISOString()}`);
    let token: string;
    try {
      token = req.cookies[Constants.JWT_COOKIE_KEY_NAME];
    } catch (_e) {
      if (process.env.NODE_ENV !== 'test') {
        throw new UnauthorizedException('JWT verification failed');
      }
    }

    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    const isLoggedOut = !!(await this.logOutRepository.findOne({ where: { jwtToken: token } }));
    if (isLoggedOut) {
      throw new UnauthorizedException('JWT verification failed');
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      const data = jwt.verify(token, jwtSecret);
      const userId = data['id'];
      if (!userId) {
        throw new UnauthorizedException('JWT verification failed');
      }

      const payload = {
        sub: userId,
        email: data['email'],
        exp: data['exp'],
        iat: data['iat'],
      };
      if (!payload || isObjectEmpty(payload)) {
        throw new UnauthorizedException('JWT verification failed');
      }
      req['decoded'] = payload;
      next();
    } catch (e) {
      Sentry.captureException(e);
      if (e instanceof HttpException || e instanceof UnauthorizedException) {
        throw e;
      }
      throw new InternalServerErrorException(Messages.AUTHORIZATION_REJECTED);
    }
  }
}
