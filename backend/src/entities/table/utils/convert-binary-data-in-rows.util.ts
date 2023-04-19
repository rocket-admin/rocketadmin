import { FoundRowsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/found-rows.ds.js';
import { binaryToHex, isBinary } from '../../../helpers/index.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function convertBinaryDataInRowsUtil(rows: FoundRowsDS, structure: Array<TableStructureDS>): FoundRowsDS {
  let { data } = rows;
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
    return rows;
  }
  data = data.map((el) => {
    for (const column of binaryColumns) {
      if (el[column.column_name]) {
        el[column.column_name] = binaryToHex(el[column.column_name] as string);
      }
    }
    return el;
  });
  rows.data = data;
  return rows;
}
