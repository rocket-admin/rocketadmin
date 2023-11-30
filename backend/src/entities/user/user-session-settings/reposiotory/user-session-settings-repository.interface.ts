import { UserSessionSettingsEntity } from '../user-session-settings.entity.js';

export interface IUserSessionSettings {
  getUserSettingsByUserId(userId: string): Promise<UserSessionSettingsEntity>;

  createOrUpdateUserSettings(userId: string, userSettings: string): Promise<UserSessionSettingsEntity>;
}
