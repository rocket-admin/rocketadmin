import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds';
import { GetCustomFieldsDs } from '../application/data-structures/get-custom-fields.ds';
import { CustomFieldsEntity } from '../custom-fields.entity';
import { buildFoundCustomFieldsDs } from '../utils/build-found-custom-fields-ds';
import { IGetCustomFields } from './custom-field-use-cases.interface';

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
