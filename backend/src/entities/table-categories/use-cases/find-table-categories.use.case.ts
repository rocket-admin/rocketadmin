import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IFindTableCategories } from './table-categories-use-cases.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { FoundTableCategoryRo } from '../dto/found-table-category.ro.js';
import { buildFoundTableCategoryRo } from '../utils/build-found-table-category.ro.js';

@Injectable()
export class FindTableCategoriesUseCase
  extends AbstractUseCase<string, Array<FoundTableCategoryRo>>
  implements IFindTableCategories
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionId: string): Promise<Array<FoundTableCategoryRo>> {
    const foundTableCategories =
      await this._dbContext.tableCategoriesRepository.findTableCategoriesForConnection(connectionId);

    return foundTableCategories.map((category) => buildFoundTableCategoryRo(category));
  }
}
