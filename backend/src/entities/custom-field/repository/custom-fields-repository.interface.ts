import { CustomFieldsEntity } from '../custom-fields.entity';

export interface ICustomFieldsRepository {
  getCustomFields(connectionId: string, tableName: string): Promise<Array<CustomFieldsEntity>>;

  saveCustomFieldsEntity(customFields: CustomFieldsEntity): Promise<CustomFieldsEntity>;

  findCustomFieldById(customFieldId: string): Promise<CustomFieldsEntity>;

  removeCustomFieldsEntity(customField: CustomFieldsEntity): Promise<CustomFieldsEntity>;
}
