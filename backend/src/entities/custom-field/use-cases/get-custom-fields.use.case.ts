import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { GetCustomFieldsDs } from '../application/data-structures/get-custom-fields.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { IGetCustomFields } from './custom-field-use-cases.interface';
import { CustomFieldsEntity } from '../custom-fields.entity';
import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds';
import { buildFoundCustomFieldsDs } from '../utils/build-found-custom-fields-ds';

@Injectable({ scope: Scope.REQUEST })
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
