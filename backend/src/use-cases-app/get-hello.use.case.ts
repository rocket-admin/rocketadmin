import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../common/abstract-use.case.js';
import { IGetHello } from './use-cases-app.interface.js';
import { BaseType } from '../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.intarface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetHelloUseCase extends AbstractUseCase<void, string> implements IGetHello {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(): Promise<string> {
    const result = await this._dbContext.userRepository.getTrue();
    if (result) {
      return 'Hello World!';
    }
    throw new HttpException(
      {
        message: 'Database not alive',
      },
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}
