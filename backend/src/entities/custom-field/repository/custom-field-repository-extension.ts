import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { CustomFieldsEntity } from '../custom-fields.entity';

export const cusomFieldsCustomRepositoryExtension = {
  async getCustomFields(connectionId: string, tableName: string): Promise<Array<CustomFieldsEntity>> {
    const qb = this.manager
      .getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.custom_fields', 'custom_fields');
    qb.where('tableSettings.connection_id = :connection_id', {
      connection_id: connectionId,
    });
    qb.andWhere('tableSettings.table_name = :table_name', {
      table_name: tableName,
    });
    const result = await qb.getOne();
    return result?.custom_fields ? result.custom_fields : [];
  },

  async saveCustomFieldsEntity(customFields: CustomFieldsEntity): Promise<CustomFieldsEntity> {
    return await this.save(customFields);
  },

  async findCustomFieldById(customFieldId: string): Promise<CustomFieldsEntity> {
    const qb = this.createQueryBuilder('customFields').where('customFields.id = :id', { id: customFieldId });
    return await qb.getOne();
  },

  async removeCustomFieldsEntity(customField: CustomFieldsEntity): Promise<CustomFieldsEntity> {
    return await this.remove(customField);
  },
};
