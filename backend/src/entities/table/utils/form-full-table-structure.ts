import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { FullTableStructureDs } from '../application/data-structures/found-table-structure.ds';
import { checkFieldAutoincrement } from '../../../helpers';

export function formFullTableStructure(
  structure: Array<ITableStructure>,
  tableSettings: TableSettingsEntity,
): Array<FullTableStructureDs> {
  const fullStructure = [];
  const { search_fields, excluded_fields } = tableSettings;
  for (const element of structure) {
    const { column_name, column_default, data_type, data_type_params, allow_null, character_maximum_length } = element;
    const indexSearch = search_fields?.indexOf(column_name);
    const indexExclude = excluded_fields?.indexOf(column_name);
    fullStructure.push({
      column_name: column_name,
      column_default: column_default,
      data_type: data_type,
      data_type_params: data_type_params ? data_type_params : undefined,
      isExcluded: indexExclude >= 0,
      isSearched: indexSearch >= 0,
      auto_increment: checkFieldAutoincrement(column_default),
      allow_null: allow_null,
      character_maximum_length: character_maximum_length,
    });
  }
  return fullStructure;
}
