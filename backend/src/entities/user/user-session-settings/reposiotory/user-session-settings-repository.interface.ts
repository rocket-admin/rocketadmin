import { UserSessionSettingsEntity } from '../user-session-settings.entity.js';

export interface IUserSessionSettings {
	getUserSettingsByUserId(userId: string): Promise<UserSessionSettingsEntity | null>;

	createOrUpdateUserSettings(userId: string, userSettings: string | null): Promise<UserSessionSettingsEntity>;
}
