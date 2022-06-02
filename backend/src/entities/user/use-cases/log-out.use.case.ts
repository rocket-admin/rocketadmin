import AbstractUseCase from '../../../common/abstract-use.case';
import { ILogOut } from './user-use-cases.interfaces';
import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';

@Injectable({ scope: Scope.REQUEST })
export class LogOutUseCase extends AbstractUseCase<string, boolean> implements ILogOut {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(token: string): Promise<boolean> {
    try {
      await this._dbContext.logOutRepository.saveLogOutUserToken(token);
      return true;
    } catch (e) {
      throw new HttpException(
        {
          message: Messages.FAILED_LOGOUT + ' Error: ' + e.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
