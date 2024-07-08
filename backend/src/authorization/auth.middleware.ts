import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { LogOutEntity } from '../entities/log-out/log-out.entity.js';
import { UserEntity } from '../entities/user/user.entity.js';
import { Messages } from '../exceptions/text/messages.js';
import { isObjectEmpty } from '../helpers/index.js';
import { Constants } from '../helpers/constants/constants.js';
import Sentry from '@sentry/minimal';
import { JwtScopesEnum } from '../entities/user/enums/jwt-scopes.enum.js';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  public constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(LogOutEntity)
    private readonly logOutRepository: Repository<LogOutEntity>,
  ) {}
  async use(req: Request, res: Response, next: (err?: any, res?: any) => void): Promise<void> {
    console.log(`auth middleware triggered ->: ${new Date().toISOString()}`);
    let token: string;
    try {
      token = req.cookies[Constants.JWT_COOKIE_KEY_NAME];
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        throw new HttpException(
          {
            message: 'JWT verification failed',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    if (!token) {
      throw new HttpException('Token is missing', HttpStatus.UNAUTHORIZED);
    }

    const isLoggedOut = !!(await this.logOutRepository.findOne({ where: { jwtToken: token } }));
    if (isLoggedOut) {
      throw new HttpException(
        {
          message: 'JWT verification failed',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      const data = jwt.verify(token, jwtSecret);
      const userId = data['id'];
      if (!userId) {
        throw new Error('JWT verification failed');
      }
      const addedScope: Array<JwtScopesEnum> = data['scope'];
      if (addedScope && addedScope.length > 0) {
        if (addedScope.includes(JwtScopesEnum.TWO_FA_ENABLE)) {
          throw new HttpException(
            {
              message: Messages.TWO_FA_REQUIRED,
            },
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      const payload = {
        sub: userId,
        email: data['email'],
        exp: data['exp'],
        iat: data['iat'],
      };
      if (!payload || isObjectEmpty(payload)) {
        throw new Error('JWT verification failed');
      }
      req['decoded'] = payload;
      next();
    } catch (e) {
      Sentry.captureException(e);
      throw new HttpException(
        {
          message: e.message === Messages.TWO_FA_REQUIRED ? e.message : Messages.AUTHORIZATION_REJECTED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
