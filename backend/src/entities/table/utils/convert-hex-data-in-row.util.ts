import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';
import { isBinary } from '../../../helpers';
import { hexToBinary } from '../../../helpers/binary-to-hex';

export function convertHexDataInRowUtil(
  row: Record<string, unknown>,
  structure: Array<ITableStructure>,
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
