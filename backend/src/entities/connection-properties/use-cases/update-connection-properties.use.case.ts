import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';
import { FoundConnectionPropertiesDs } from '../application/data-structures/found-connection-properties.ds.js';
import { buildFoundConnectionPropertiesDs } from '../utils/build-found-connection-properties-ds.js';
import {
  buildUpdateConnectionPropertiesObject,
  IUpdateConnectionPropertiesObject,
} from '../utils/build-update-connection-properties-object.js';
import { validateCreateConnectionPropertiesDs } from '../utils/validate-create-connection-properties-ds.js';
import { IUpdateConnectionProperties } from './connection-properties-use.cases.interface.js';

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
    const { connectionId, master_password, table_categories } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );
    await validateCreateConnectionPropertiesDs(inputData, foundConnection);
    const connectionPropertiesToUpdate =
      await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);
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

    const categoriesToRemove = await this._dbContext.tableCategoriesRepository.find({
      where: { connection_properties_id: connectionPropertiesToUpdate.id },
    });

    if (categoriesToRemove && categoriesToRemove.length > 0) {
      await this._dbContext.tableCategoriesRepository.remove(categoriesToRemove);
      updated.table_categories = [];
    }

    const updatedProperties = await this._dbContext.connectionPropertiesRepository.saveNewConnectionProperties(updated);
    if (table_categories && table_categories.length) {
      const createdCategories = table_categories.map((category) => {
        const newCategory = this._dbContext.tableCategoriesRepository.create({
          category_name: category.category_name,
          tables: category.tables,
          category_color: category.category_color,
          category_id: category.category_id,
        });
        newCategory.connection_properties = updatedProperties;
        return newCategory;
      });
      const savedCategories = await this._dbContext.tableCategoriesRepository.save(createdCategories);
      updatedProperties.table_categories = savedCategories;
    }
    return buildFoundConnectionPropertiesDs(updatedProperties);
  }
}
