import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds';
import { buildFoundConnectionPropertiesDs } from '../utils/build-found-connection-properties-ds';
import {
  buildUpdateConnectionPropertiesObject,
  IUpdateConnectionPropertiesObject,
} from '../utils/build-update-connection-properties-object';
import { validateCreateConnectionPropertiesDs } from '../utils/validate-create-connection-properties-ds';
import { IUpdateConnectionProperties } from './connection-properties-use.cases.interface';

@Injectable()
export class UpdateConnectionPropertiesUseCase
  extends AbstractUseCase<CreateConnectionPropertiesDs, FoundConnectionPropertiesDs>
  implements IUpdateConnectionProperties
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateConnectionPropertiesDs): Promise<FoundConnectionPropertiesDs> {
    const { connectionId, master_password } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );
    await validateCreateConnectionPropertiesDs(inputData, foundConnection);
    const connectionPropertiesToUpdate = await this._dbContext.connectionPropertiesRepository.findConnectionProperties(
      connectionId,
    );
    if (!connectionPropertiesToUpdate) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_PROPERTIES_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updatePropertiesObject: IUpdateConnectionPropertiesObject = buildUpdateConnectionPropertiesObject(inputData);
    const updated = Object.assign(connectionPropertiesToUpdate, updatePropertiesObject);
    const updatedProperties = await this._dbContext.connectionPropertiesRepository.saveNewConnectionProperties(updated);
    return buildFoundConnectionPropertiesDs(updatedProperties);
  }
}
