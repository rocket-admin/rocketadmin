import { EntityRepository, getRepository, Repository } from 'typeorm';
import { CustomFieldsEntity } from '../custom-fields.entity';
import { ICustomFieldsRepository } from './custom-fields-repository.interface';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';

@EntityRepository(CustomFieldsEntity)
export class CustomFieldsRepository extends Repository<CustomFieldsEntity> implements ICustomFieldsRepository {
  constructor() {
    super();
  }

  public async getCustomFields(connectionId: string, tableName: string): Promise<Array<CustomFieldsEntity>> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.custom_fields', 'custom_fields');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', {
      connection_id: connectionId,
    });
    qb.andWhere('tableSettings.table_name = :table_name', {
      table_name: tableName,
    });
    const result = await qb.getOne();
    return result?.custom_fields ? result.custom_fields : [];
  }

  public async saveCustomFieldsEntity(customFields: CustomFieldsEntity): Promise<CustomFieldsEntity> {
    return await this.save(customFields);
  }

  public async findCustomFieldById(customFieldId: string): Promise<CustomFieldsEntity> {
    const qb = await getRepository(CustomFieldsEntity)
      .createQueryBuilder('customFields')
      .where('1=1')
      .andWhere('customFields.id = :id', { id: customFieldId });
    return await qb.getOne();
  }

  public async removeCustomFieldsEntity(customField: CustomFieldsEntity): Promise<CustomFieldsEntity> {
    return await this.remove(customField);
  }
}
