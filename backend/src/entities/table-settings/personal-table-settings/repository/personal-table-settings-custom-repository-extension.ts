import { PersonalTableSettingsEntity } from '../personal-table-settings.entity.js';
import { IPersonalTableSettingsRepository } from './personal-table-settings.repository.interface.js';

export const personalTableSettingsCustomRepositoryExtension: IPersonalTableSettingsRepository = {
  async findUserTableSettings(
    userId: string,
    connectionId: string,
    tableName: string,
  ): Promise<PersonalTableSettingsEntity | null> {
    const qb = this.createQueryBuilder('personal_table_settings');
    qb.where('personal_table_settings.user_id = :userId', {
      userId,
    });
    qb.andWhere('personal_table_settings.connection_id = :connectionId', {
      connectionId,
    });
    qb.andWhere('personal_table_settings.table_name = :tableName', {
      tableName,
    });
    return await qb.getOne();
  },
};
