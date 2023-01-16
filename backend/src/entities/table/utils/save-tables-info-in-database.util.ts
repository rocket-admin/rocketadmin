import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { TableFieldInfoEntity } from '../../table-field-info/table-field-info.entity.js';
import { TableInfoEntity } from '../../table-info/table-info.entity.js';

export function buildTableFieldInfoEntity(
  structure: ITableStructure,
  tableInfo: TableInfoEntity,
): TableFieldInfoEntity {
  const newTableFieldInfoEntity = new TableFieldInfoEntity();
  newTableFieldInfoEntity.column_name = structure.column_name;
  newTableFieldInfoEntity.data_type = structure.data_type;
  if (structure.character_maximum_length) {
    newTableFieldInfoEntity.character_maximum_length = structure.character_maximum_length.toString();
  }
  newTableFieldInfoEntity.allow_null = structure.allow_null;
  newTableFieldInfoEntity.column_default = structure.column_default;
  newTableFieldInfoEntity.data_type_params = structure.data_type_params;
  newTableFieldInfoEntity.udt_name = structure.udt_name;
  newTableFieldInfoEntity.table_info = tableInfo;
  return newTableFieldInfoEntity;
}

export function buildTableInfoEntity(tableName: string, connection: ConnectionEntity): TableInfoEntity {
  const newTableInfoEntity = new TableInfoEntity();
  newTableInfoEntity.table_name = tableName;
  newTableInfoEntity.connection = connection;
  newTableInfoEntity.table_fields_info = [];
  return newTableInfoEntity;
}
