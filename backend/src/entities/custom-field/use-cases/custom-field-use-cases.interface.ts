import { InTransactionEnum } from '../../../enums/index.js';
import { FoundTableSettingsDs } from '../../table-settings/application/data-structures/found-table-settings.ds.js';
import { CreateCustomFieldsDs } from '../application/data-structures/create-custom-fields.ds.js';
import { DeleteCustomFieldsDs } from '../application/data-structures/delete-custom-fields.ds.js';
import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds.js';
import { GetCustomFieldsDs } from '../application/data-structures/get-custom-fields.ds.js';
import { UpdateCustomFieldsDs } from '../application/data-structures/update-custom-fields.ds.js';

export interface IGetCustomFields {
  execute(inputData: GetCustomFieldsDs, inTransaction: InTransactionEnum): Promise<Array<FoundCustomFieldsDs>>;
}

export interface ICreateCustomFields {
  execute(inputData: CreateCustomFieldsDs, inTransaction: InTransactionEnum): Promise<FoundTableSettingsDs>;
}

export interface IUpdateCustomFields {
  execute(inputData: UpdateCustomFieldsDs, inTransaction: InTransactionEnum): Promise<FoundCustomFieldsDs>;
}

export interface IDeleteCustomField {
  execute(inputData: DeleteCustomFieldsDs, inTransaction: InTransactionEnum): Promise<FoundTableSettingsDs>;
}
