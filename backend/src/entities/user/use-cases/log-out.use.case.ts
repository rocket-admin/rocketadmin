import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { ILogOut } from './user-use-cases.interfaces';

@Injectable()
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
