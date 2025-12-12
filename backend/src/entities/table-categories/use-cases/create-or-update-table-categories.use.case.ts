import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ICreateTableCategories } from './table-categories-use-cases.interface.js';
import { FoundTableCategoryRo } from '../dto/found-table-category.ro.js';
import { CreateOrUpdateTableCategoriesDS } from '../data-sctructures/create-or-update-table-categories.ds.js';
import { validateTableCategories } from '../utils/validate-table-categories.util.js';
import { buildFoundTableCategoryRo } from '../utils/build-found-table-category.ro.js';

@Injectable()
export class CreateOrUpdateTableCategoriesUseCase
  extends AbstractUseCase<CreateOrUpdateTableCategoriesDS, Array<FoundTableCategoryRo>>
  implements ICreateTableCategories
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateOrUpdateTableCategoriesDS): Promise<Array<FoundTableCategoryRo>> {
    const { connectionId, master_password, table_categories } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      master_password,
    );

    await validateTableCategories(table_categories, foundConnection);

    const foundTableCategories =
      await this._dbContext.tableCategoriesRepository.findTableCategoriesForConnection(connectionId);

    if (foundTableCategories.length) {
      await this._dbContext.tableCategoriesRepository.remove(foundTableCategories);
    }

    let connectionProperties =
      await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);

    if (!connectionProperties) {
      const newConnectionProperties = this._dbContext.connectionPropertiesRepository.create({});
      newConnectionProperties.connection = foundConnection;
      connectionProperties = await this._dbContext.connectionPropertiesRepository.save(newConnectionProperties);
    }

    const createdCategories = table_categories.map((category) => {
      const newCategory = this._dbContext.tableCategoriesRepository.create({
        category_name: category.category_name,
        tables: category.tables,
        category_color: category.category_color,
        category_id: category.category_id,
      });
      newCategory.connection_properties = connectionProperties;
      return newCategory;
    });
    const savedCategories = await this._dbContext.tableCategoriesRepository.save(createdCategories);
    return savedCategories.map((category) => buildFoundTableCategoryRo(category));
  }
}
