import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds.js';
import { CustomFieldsEntity } from '../custom-fields.entity.js';

export function buildFoundCustomFieldsDs(customField: CustomFieldsEntity): FoundCustomFieldsDs {
	const { id, template_string, text, type } = customField;
	return {
		id: id,
		template_string: template_string,
		text: text,
		type: type,
	};
}
