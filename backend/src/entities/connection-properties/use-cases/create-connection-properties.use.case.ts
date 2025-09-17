import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds.js';
import { buildConnectionPropertiesEntity } from '../utils/build-connection-properties-entity.js';
import { buildFoundConnectionPropertiesDs } from '../utils/build-found-connection-properties-ds.js';
import { validateCreateConnectionPropertiesDs } from '../utils/validate-create-connection-properties-ds.js';
import { ICreateConnectionProperties } from './connection-properties-use.cases.interface.js';

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
    const { connectionId, master_password, table_categories } = inputData;
    let foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );
    await validateCreateConnectionPropertiesDs(inputData, foundConnection);
    const newConnectionProperties = buildConnectionPropertiesEntity(inputData, foundConnection);
    const createdConnectionProperties =
      await this._dbContext.connectionPropertiesRepository.saveNewConnectionProperties(newConnectionProperties);

    if (table_categories && table_categories.length > 0) {
      const createdCategories = table_categories.map((category) => {
        const newCategory = this._dbContext.tableCategoriesRepository.create({
          category_name: category.category_name,
          tables: category.tables,
        });
        newCategory.connection_properties = createdConnectionProperties;
        return newCategory;
      });
      const savedCategories = await this._dbContext.tableCategoriesRepository.save(createdCategories);
      createdConnectionProperties.table_categories = savedCategories;
    }

    if (foundConnection.masterEncryption && master_password) {
      foundConnection = Encryptor.encryptConnectionCredentials(foundConnection, master_password);
    }
    await this._dbContext.connectionRepository.saveNewConnection(foundConnection);
    return buildFoundConnectionPropertiesDs(createdConnectionProperties);
  }
}
