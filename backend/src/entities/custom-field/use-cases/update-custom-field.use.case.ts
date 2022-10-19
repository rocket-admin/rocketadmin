import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { UpdateCustomFieldsDs } from '../application/data-structures/update-custom-fields.ds';
import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds';
import { IUpdateCustomFields } from './custom-field-use-cases.interface';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../../exceptions/text/messages';
import { buildFoundCustomFieldsDs } from '../utils/build-found-custom-fields-ds';
import { validateCreateCustomFieldDto } from '../utils/validate-create-custom-field-dto';

@Injectable()
export class UpdateCustomFieldUseCase
  extends AbstractUseCase<UpdateCustomFieldsDs, FoundCustomFieldsDs>
  implements IUpdateCustomFields
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateCustomFieldsDs): Promise<FoundCustomFieldsDs> {
    const updateFieldDto = inputData.updateFieldDto;
    const { connectionId, tableName, masterPwd, userId } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    await validateCreateCustomFieldDto(updateFieldDto, foundConnection, userId, tableName);
    const fieldToUpdate = await this._dbContext.customFieldsRepository.findCustomFieldById(updateFieldDto.id);
    if (!fieldToUpdate) {
      throw new HttpException(
        {
          message: Messages.CUSTOM_FIELD_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    delete updateFieldDto.id;
    const updated = Object.assign(fieldToUpdate, updateFieldDto);
    const updatedCustomFields = await this._dbContext.customFieldsRepository.saveCustomFieldsEntity(updated);
    return buildFoundCustomFieldsDs(updatedCustomFields);
  }
}
