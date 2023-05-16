import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds.js';
import { buildFoundConnectionPropertiesDs } from '../utils/build-found-connection-properties-ds.js';
import { IDeleteConnectionProperties } from './connection-properties-use.cases.interface.js';

@Injectable()
export class DeleteConnectionPropertiesUseCase
  extends AbstractUseCase<string, FoundConnectionPropertiesDs>
  implements IDeleteConnectionProperties
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionId: string): Promise<FoundConnectionPropertiesDs> {
    const connectionPropertiesToDelete = await this._dbContext.connectionPropertiesRepository.findConnectionProperties(
      connectionId,
    );
    if (!connectionPropertiesToDelete) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_PROPERTIES_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const deletedProperties = await this._dbContext.connectionPropertiesRepository.removeConnectionProperties(
      connectionPropertiesToDelete,
    );
    return buildFoundConnectionPropertiesDs(deletedProperties);
  }
}
