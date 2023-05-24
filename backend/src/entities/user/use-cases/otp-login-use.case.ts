import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IOtpLogin } from './user-use-cases.interfaces.js';
import { IToken, generateGwtToken } from '../utils/generate-gwt-token.js';
import { Messages } from '../../../exceptions/text/messages.js';
import jwt from 'jsonwebtoken';
import Sentry from '@sentry/minimal';

@Injectable()
export class OtpLoginUseCase extends AbstractUseCase<string, IToken> implements IOtpLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(temporaryJwtToken: string): Promise<IToken> {
    if (!temporaryJwtToken) {
      throw new HttpException(
        {
          message: Messages.TOKEN_MISSING,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const temporaryJwtSecret = process.env.TEMPORARY_JWT;
    try {
      const data = jwt.verify(temporaryJwtToken, temporaryJwtSecret);
      const userId = data['id'];
      if (!userId) {
        throw new Error('JWT verification failed');
      }
      const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
      if (!foundUser) {
        throw new HttpException(
          {
            message: Messages.USER_NOT_FOUND,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      return generateGwtToken(foundUser);
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(
        {
          message: Messages.AUTHORIZATION_REJECTED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
