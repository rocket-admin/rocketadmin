import { TableWidgetEntity } from '../../src/entities/widget/table-widget.entity';
import { CreateTableWidgetDto } from '../../src/entities/widget/dto';

export const compareTableWidgetsArrays = (
  arr_1: Array<TableWidgetEntity | CreateTableWidgetDto>,
  arr_2: Array<TableWidgetEntity | CreateTableWidgetDto>,
): boolean => {
  arr_1 = arr_1.map((el) => {
    for (const elKey in el) {
      if (!el[elKey]) delete el[elKey];
      if (elKey === 'id') delete el[elKey];
    }
    return el;
  });
  arr_2 = arr_2.map((el) => {
    for (const elKey in el) {
      if (!el[elKey]) delete el[elKey];
      if (elKey === 'id') delete el[elKey];
    }
    return el;
  });
  for (const w_1 of arr_1) {
    const w_2 = arr_2[arr_2.findIndex((_) => _.field_name === w_1.field_name)];
    if (!w_2) return false;
    for (const key in w_1) {
      console.log('=>(compare-table-widgets-arrays.ts:28) ', w_1[key], w_2[key]);
      if (w_1[key] !== w_2[key]) return false;
    }
  }
  return true;
};
