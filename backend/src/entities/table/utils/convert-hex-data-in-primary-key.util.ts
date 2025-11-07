import { isBinary } from '../../../helpers/index.js';
import { hexToBinary } from '../../../helpers/binary-to-hex.js';
import { TableStructureDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function convertHexDataInPrimaryKeyUtil(
  primaryKey: Record<string, unknown>,
  structure: Array<TableStructureDS>,
): Record<string, unknown> {
  const binaryColumns = structure.filter((el) => isBinary(el.data_type));

  for (const column of binaryColumns) {
    const columnValue = primaryKey[column.column_name];
    if (columnValue) {
      primaryKey[column.column_name] = hexToBinary(columnValue as string);
    }
  }

  return primaryKey;
}
