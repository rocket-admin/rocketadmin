import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { TokenDs } from '../application/data-structures/token.ds';
import { IRefreshConnectionAgentToken } from './use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';

@Injectable({ scope: Scope.REQUEST })
export class RefreshConnectionAgentTokenUseCase
  extends AbstractUseCase<string, TokenDs>
  implements IRefreshConnectionAgentToken
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionId: string): Promise<TokenDs> {
    const refreshedToken = await this._dbContext.agentRepository.renewOrCreateConnectionToken(connectionId);
    return {
      token: refreshedToken,
    };
  }
}
