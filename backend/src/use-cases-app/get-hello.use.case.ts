import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../common/abstract-use.case';
import { IGetHello } from './use-cases-app.interface';
import { BaseType } from '../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../common/application/global-database-context.intarface';

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
