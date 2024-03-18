import { FoundRowsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/found-rows.ds.js';
import { binaryToHex, isBinary } from '../../../helpers/index.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function convertBinaryDataInRowsUtil(rows: FoundRowsDS, structure: Array<TableStructureDS>): FoundRowsDS {
  const binaryColumns = structure.filter((el) => isBinary(el.data_type));

  if (binaryColumns.length <= 0) {
    return rows;
  }

  rows.data = rows.data.map((el) => {
    binaryColumns.forEach((column) => {
      if (el[column.column_name]) {
        el[column.column_name] = binaryToHex(el[column.column_name] as string);
      }
    });
    return el;
  });

  return rows;
}
