import { PersonalTableSettingsData } from '../data-structures/create-personal-table-settings.ds.js';
import { PersonalTableSettingsEntity } from '../personal-table-settings.entity.js';

const NULLABLE_FIELDS = ['ordering', 'ordering_field'];

export function buildNewPersonalTableSettingsEntity(
	personalSettingsData: PersonalTableSettingsData,
): PersonalTableSettingsEntity {
	const newEntity = new PersonalTableSettingsEntity();
	Object.assign(newEntity, personalSettingsData);
	Object.keys(personalSettingsData).forEach((key) => {
		if (personalSettingsData[key as keyof PersonalTableSettingsData] === null && !NULLABLE_FIELDS.includes(key)) {
			// eslint-disable-next-line security/detect-object-injection
			delete (newEntity as any)[key];
		}
	});
	return newEntity;
}
