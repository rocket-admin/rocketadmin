import { isBinary } from '../../../helpers/index.js';
import { hexToBinary } from '../../../helpers/binary-to-hex.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function convertHexDataInRowUtil(
  row: Record<string, unknown>,
  structure: Array<TableStructureDS>,
): Record<string, unknown> {
  const binaryColumns = structure
    .map((el) => {
      return {
        column_name: el.column_name,
        data_type: el.data_type,
      };
    })
    .filter((el) => {
      return isBinary(el.data_type);
    });
  if (binaryColumns.length <= 0) {
    return row;
  }
  for (const column of binaryColumns) {
    if (row[column.column_name]) {
      row[column.column_name] = hexToBinary(row[column.column_name] as string);
    }
  }
  return row;
}
