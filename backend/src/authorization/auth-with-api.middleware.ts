import { HttpException, HttpStatus, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user/user.entity.js';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { Constants } from '../helpers/constants/constants.js';
import { isObjectEmpty } from '../helpers/is-object-empty.js';
import { JwtScopesEnum } from '../entities/user/enums/jwt-scopes.enum.js';
import { Messages } from '../exceptions/text/messages.js';
import jwt from 'jsonwebtoken';
import Sentry from '@sentry/minimal';
import { Encryptor } from '../helpers/encryption/encryptor.js';
import { EncryptionAlgorithmEnum } from '../enums/encryption-algorithm.enum.js';

@Injectable()
export class AuthWithApiMiddleware implements NestMiddleware {
  public constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async use(req: Request, res: Response, next: (err?: any, res?: any) => void): Promise<void> {
    console.info(`auth with api middleware triggered ->: ${new Date().toISOString()}`);
    try {
      console.info(`Auth with API middleware triggered ->: ${new Date().toISOString()}`);
      await this.authenticateRequest(req);
      next();
    } catch (error) {
      Sentry.captureException(error);
      this.handleAuthenticationError(error);
    }
  }

  private async authenticateRequest(req: Request): Promise<void> {
    const tokenFromCookie = this.getTokenFromCookie(req);
    if (tokenFromCookie) {
      await this.authenticateWithToken(tokenFromCookie, req);
    } else {
      await this.authenticateWithApiKey(req);
    }
  }

  private getTokenFromCookie(req: Request): string | undefined {
    return req.cookies?.[Constants.JWT_COOKIE_KEY_NAME];
  }

  private handleAuthenticationError(error: any): void {
    throw new HttpException(
      {
        message: error.message === Messages.TWO_FA_REQUIRED ? error.message : Messages.AUTHORIZATION_REJECTED,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  private async authenticateWithToken(tokenFromCookie: string, req: Request): Promise<void> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      const data = jwt.verify(tokenFromCookie, jwtSecret);
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
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(
        {
          message: error.message === Messages.TWO_FA_REQUIRED ? error.message : Messages.AUTHORIZATION_REJECTED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async authenticateWithApiKey(req: Request): Promise<void> {
    let apiKey = req.headers?.['x-api-key'];
    if (Array.isArray(apiKey)) {
      apiKey = apiKey[0];
    }
    if (!apiKey) {
      throw new UnauthorizedException(Messages.NO_AUTH_KEYS_FOUND);
    }
    const apiKeyHash = await Encryptor.processDataWithAlgorithm(apiKey, EncryptionAlgorithmEnum.sha256);
    const foundUserByApiKey = await this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.api_keys', 'api_key')
      .where('api_key.hash = :hash', { hash: apiKeyHash })
      .getOne();

    if (!foundUserByApiKey) {
      throw new UnauthorizedException(Messages.NO_AUTH_KEYS_FOUND);
    }
    req['decoded'] = {
      sub: foundUserByApiKey.id,
      email: foundUserByApiKey.email,
    };
  }
}
