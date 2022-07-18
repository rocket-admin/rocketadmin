import { IRows, ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';
import { binaryToHex, isBinary } from '../../../helpers';

export function convertBinaryDataInRowsUtil(rows: IRows, structure: Array<ITableStructure>): IRows {
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
