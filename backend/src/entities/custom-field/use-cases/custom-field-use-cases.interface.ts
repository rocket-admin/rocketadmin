import { GetCustomFieldsDs } from '../application/data-structures/get-custom-fields.ds';
import { CreateCustomFieldsDs } from '../application/data-structures/create-custom-fields.ds';
import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds';
import { UpdateCustomFieldsDs } from '../application/data-structures/update-custom-fields.ds';
import { DeleteCustomFieldsDs } from '../application/data-structures/delete-custom-fields.ds';
import { FoundTableSettingsDs } from '../../table-settings/application/data-structures/found-table-settings.ds';

export interface IGetCustomFields {
  execute(inputData: GetCustomFieldsDs): Promise<Array<FoundCustomFieldsDs>>;
}

export interface ICreateCustomFields {
  execute(inputData: CreateCustomFieldsDs): Promise<FoundTableSettingsDs>;
}

export interface IUpdateCustomFields {
  execute(inputData: UpdateCustomFieldsDs): Promise<FoundCustomFieldsDs>;
}

export interface IDeleteCustomField {
  execute(inputData: DeleteCustomFieldsDs): Promise<FoundTableSettingsDs>;
}
