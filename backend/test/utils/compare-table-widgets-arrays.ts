import * as json5 from 'json5';
import { CreateTableWidgetDto } from '../../src/entities/widget/dto';
import { TableWidgetEntity } from '../../src/entities/widget/table-widget.entity';

export const compareTableWidgetsArrays = (
  arr_1: Array<TableWidgetEntity | CreateTableWidgetDto>,
  arr_2: Array<TableWidgetEntity | CreateTableWidgetDto>,
): boolean => {
  arr_1 = arr_1.map((el) => {
    for (const elKey in el) {
      if (!el[elKey]) delete el[elKey];
      if (elKey === 'id') delete el[elKey];
      if (elKey === 'widget_params') {
        el[elKey] = JSON.stringify(json5.parse(el[elKey]))
      }
    }
    return el;
  });
  arr_2 = arr_2.map((el) => {
    for (const elKey in el) {
      if (!el[elKey]) delete el[elKey];
      if (elKey === 'id') delete el[elKey];
      if (elKey === 'widget_params') {
        el[elKey] = JSON.stringify(json5.parse(el[elKey]))
      }
    }
    return el;
  });
  for (const w_1 of arr_1) {
    const w_2 = arr_2[arr_2.findIndex((_) => _.field_name === w_1.field_name)];
    if (!w_2) return false;
    for (const key in w_1) {
      if (w_1[key] !== w_2[key]) return false;
    }
  }
  return true;
};
