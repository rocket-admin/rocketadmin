import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds.js';
import { GetCustomFieldsDs } from '../application/data-structures/get-custom-fields.ds.js';
import { CustomFieldsEntity } from '../custom-fields.entity.js';
import { buildFoundCustomFieldsDs } from '../utils/build-found-custom-fields-ds.js';
import { IGetCustomFields } from './custom-field-use-cases.interface.js';

@Injectable()
export class GetCustomFieldsUseCase
  extends AbstractUseCase<GetCustomFieldsDs, Array<FoundCustomFieldsDs>>
  implements IGetCustomFields
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetCustomFieldsDs): Promise<Array<FoundCustomFieldsDs>> {
    const { connectionId, tableName } = inputData;
    const foundCustomFields = await this._dbContext.customFieldsRepository.getCustomFields(connectionId, tableName);
    if (foundCustomFields.length <= 0) {
      return [];
    }
    return foundCustomFields.map((field: CustomFieldsEntity) => {
      return buildFoundCustomFieldsDs(field);
    });
  }
}
