import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IOtpLogin } from './user-use-cases.interfaces.js';
import { IToken, generateGwtToken } from '../utils/generate-gwt-token.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class OtpLoginUseCase extends AbstractUseCase<string, IToken> implements IOtpLogin {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<IToken> {
    const user = await this._dbContext.userRepository.findOneUserById(userId);
    if (!user) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return generateGwtToken(user);
  }
}
