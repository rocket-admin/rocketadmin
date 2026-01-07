import { FoundPersonalTableSettingsDto } from '../dto/found-personal-table-settings.dto.js';
import { PersonalTableSettingsEntity } from '../personal-table-settings.entity.js';

export function buildFoundTableSettingsDto(
  personalTableSettings: PersonalTableSettingsEntity,
): FoundPersonalTableSettingsDto {
  return {
    id: personalTableSettings.id,
    table_name: personalTableSettings.table_name,
    ordering: personalTableSettings.ordering,
    ordering_field: personalTableSettings.ordering_field,
    list_per_page: personalTableSettings.list_per_page,
    list_fields: personalTableSettings.list_fields,
    original_names: personalTableSettings.original_names,
    columns_view: personalTableSettings.columns_view,
  };
}
