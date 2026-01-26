import { PersonalTableSettingsEntity } from '../personal-table-settings.entity.js';

export interface IPersonalTableSettingsRepository {
  findUserTableSettings(
    userId: string,
    connectionId: string,
    tableName: string,
  ): Promise<PersonalTableSettingsEntity | null>;
}
