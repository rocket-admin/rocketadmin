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
import { TableCategoriesEntity } from '../../table-categories/table-categories.entity.js';

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

    const foundCategories = await this._dbContext.tableCategoriesRepository.find({
      where: { connection_properties_id: connectionPropertiesToUpdate.id },
    });

    const newCategories: Array<TableCategoriesEntity> = [];

    if (table_categories && table_categories.length > 0) {
      const categoriesToRemove = foundCategories.filter((foundCategory) => {
        return !table_categories?.some((inputCategory) => inputCategory.category_id === foundCategory.category_id);
      });
      if (categoriesToRemove && categoriesToRemove.length > 0) {
        await this._dbContext.tableCategoriesRepository.remove(categoriesToRemove);
      }

      const categoriesToCreate = table_categories.filter((inputCategory) => {
        return !foundCategories.some((foundCategory) => foundCategory.category_id === inputCategory.category_id);
      });

      if (categoriesToCreate && categoriesToCreate.length > 0) {
        const createdCategories = categoriesToCreate.map((category) => {
          const newCategory = this._dbContext.tableCategoriesRepository.create({
            category_name: category.category_name,
            tables: category.tables,
            category_color: category.category_color,
            category_id: category.category_id,
          });
          newCategory.connection_properties = connectionPropertiesToUpdate;
          return newCategory;
        });
        const savedNewCategories = await this._dbContext.tableCategoriesRepository.save(createdCategories);
        newCategories.push(...savedNewCategories);
      }

      const categoriesToUpdate = table_categories.filter((inputCategory) => {
        return foundCategories.some((foundCategory) => foundCategory.category_id === inputCategory.category_id);
      });

      for (const category of categoriesToUpdate) {
        const categoryToUpdate = foundCategories.find(
          (foundCategory) => foundCategory.category_id === category.category_id,
        );
        if (categoryToUpdate) {
          categoryToUpdate.category_name = category.category_name;
          categoryToUpdate.category_color = category.category_color;
          categoryToUpdate.tables = category.tables;
          const savedUpdatedCategory = await this._dbContext.tableCategoriesRepository.save(categoryToUpdate);
          newCategories.push(savedUpdatedCategory);
        }
      }
    } else {
      newCategories.push(...foundCategories);
    }

    const updatedProperties = await this._dbContext.connectionPropertiesRepository.saveNewConnectionProperties(updated);
    updatedProperties.table_categories = newCategories;

    return buildFoundConnectionPropertiesDs(updatedProperties);
  }
}
