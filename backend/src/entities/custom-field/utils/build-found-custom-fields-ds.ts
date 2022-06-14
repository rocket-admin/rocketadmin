import { CustomFieldsEntity } from '../custom-fields.entity';
import { FoundCustomFieldsDs } from '../application/data-structures/found-custom-fields.ds';

export function buildFoundCustomFieldsDs(customField: CustomFieldsEntity): FoundCustomFieldsDs {
  const { id, template_string, text, type } = customField;
  return {
    id: id,
    template_string: template_string,
    text: text,
    type: type,
  };
}
