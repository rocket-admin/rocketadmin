import { TableField } from '../models/table';

export function getTableTypes(structure: TableField[], foreignKeysList: string[]) {
  if (!structure || !Array.isArray(structure) || structure.length === 0) {
    return {};
  }

  const tableTypes = Object.assign({}, ...structure.map((field: TableField) => {
    if (field.data_type === 'tinyint' && field.character_maximum_length === 1 )
    return {[field.column_name]: 'boolean'}
    if (foreignKeysList.includes(field.column_name))
    return {[field.column_name]: 'foreign key'}
      return {[field.column_name]: field.data_type}
  }))
  return tableTypes;
}
