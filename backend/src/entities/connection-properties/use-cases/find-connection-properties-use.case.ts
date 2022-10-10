import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { IFindConnectionProperties } from './connection-properties-use.cases.interface';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds';
import { buildFoundConnectionPropertiesDs } from '../utils/build-found-connection-properties-ds';

@Injectable()
export class FindConnectionPropertiesUseCase extends AbstractUseCase<string, FoundConnectionPropertiesDs | null>
  implements IFindConnectionProperties {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionId: string): Promise<FoundConnectionPropertiesDs>{
    const foundConnectionProperties = await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);
    if (!foundConnectionProperties) {
      return null;
    }
    return buildFoundConnectionPropertiesDs(foundConnectionProperties);
  }
}
