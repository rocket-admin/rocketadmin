import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';
import { isBinary } from '../../../helpers';
import { hexToBinary } from '../../../helpers/binary-to-hex';

export function convertHexDataInPrimaryKeyUtil(
  primaryKey: Record<string, unknown>,
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
    return primaryKey;
  }
  for (const column of binaryColumns) {
    if (primaryKey[column.column_name]) {
      primaryKey[column.column_name] = hexToBinary(primaryKey[column.column_name] as string);
    }
  }
  return primaryKey;
}
