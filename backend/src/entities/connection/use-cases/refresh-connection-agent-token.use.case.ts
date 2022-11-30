import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { TokenDs } from '../application/data-structures/token.ds';
import { IRefreshConnectionAgentToken } from './use-cases.interfaces';

@Injectable()
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
