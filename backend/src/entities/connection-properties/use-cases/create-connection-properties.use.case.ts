import AbstractUseCase from '../../../common/abstract-use.case';
import { BaseType } from '../../../common/data-injection.tokens';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds';
import { ICreateConnectionProperties } from './connection-properties-use.cases.interface';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { validateCreateConnectionPropertiesDs } from '../utils/validate-create-connection-properties-ds';
import { buildConnectionPropertiesEntity } from '../utils/build-connection-properties-entity';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { buildFoundConnectionPropertiesDs } from '../utils/build-found-connection-properties-ds';

@Injectable()
export class CreateConnectionPropertiesUseCase
  extends AbstractUseCase<CreateConnectionPropertiesDs, FoundConnectionPropertiesDs>
  implements ICreateConnectionProperties
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateConnectionPropertiesDs): Promise<FoundConnectionPropertiesDs> {
    const { connectionId, master_password } = inputData;
    let foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );
    await validateCreateConnectionPropertiesDs(inputData, foundConnection);
    const newConnectionProperties = buildConnectionPropertiesEntity(inputData, foundConnection);
    const createdConnectionProperties =
      await this._dbContext.connectionPropertiesRepository.saveNewConnectionProperties(newConnectionProperties);
    if (foundConnection.masterEncryption && master_password) {
      foundConnection = Encryptor.encryptConnectionCredentials(foundConnection, master_password);
    }
    await this._dbContext.connectionRepository.saveNewConnection(foundConnection);
    return buildFoundConnectionPropertiesDs(createdConnectionProperties);
  }
}
