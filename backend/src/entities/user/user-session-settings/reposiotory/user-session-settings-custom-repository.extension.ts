import { UserSessionSettingsEntity } from '../user-session-settings.entity.js';
import { IUserSessionSettings } from './user-session-settings-repository.interface.js';

export const userSessionSettingsRepositoryExtension: IUserSessionSettings = {
  async getUserSettingsByUserId(userId: string): Promise<UserSessionSettingsEntity> {
    const qb = this.createQueryBuilder('user_session_settings').where('user_session_settings.userId = :userId', {
      userId: userId,
    });
    return await qb.getOne();
  },

  async createOrUpdateUserSettings(userId: string, userSettings: string): Promise<UserSessionSettingsEntity> {
    const qb = this.createQueryBuilder('user_session_settings').where('user_session_settings.userId = :userId', {
      userId: userId,
    });
    const foundUserSettings = await qb.getOne();
    if (foundUserSettings) {
      foundUserSettings.userSettings = userSettings;
      foundUserSettings.createdAt = new Date();
      return await this.save(foundUserSettings);
    }
    const newUserSettings = new UserSessionSettingsEntity();
    newUserSettings.userSettings = userSettings;
    newUserSettings.userId = userId;
    return await this.save(newUserSettings);
  },
};
