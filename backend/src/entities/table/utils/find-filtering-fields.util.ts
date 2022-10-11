import { FilteringFieldsDs } from '../application/data-structures/found-table-rows.ds';
import { FilterCriteriaEnum } from '../../../enums';
import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';

export function findFilteringFieldsUtil(
  query: string,
  tableStructure: Array<ITableStructure>,
): Array<FilteringFieldsDs> {
  const rowNames = tableStructure.map((el) => {
    return el.column_name;
  });
  const filteringItems = [];
  for (const fieldname of rowNames) {
    if (query.hasOwnProperty(`f_${fieldname}__eq`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.eq,
        value: query[`f_${fieldname}__eq`],
      });
    }

    if (query.hasOwnProperty(`f_${fieldname}__startswith`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.startswith,
        value: query[`f_${fieldname}__startswith`],
      });
    }
    if (query.hasOwnProperty(`f_${fieldname}__endswith`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.endswith,
        value: query[`f_${fieldname}__endswith`],
      });
    }
    if (query.hasOwnProperty(`f_${fieldname}__gt`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.gt,
        value: query[`f_${fieldname}__gt`],
      });
    }
    if (query.hasOwnProperty(`f_${fieldname}__lt`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.lt,
        value: query[`f_${fieldname}__lt`],
      });
    }
    if (query.hasOwnProperty(`f_${fieldname}__lte`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.lte,
        value: query[`f_${fieldname}__lte`],
      });
    }
    if (query.hasOwnProperty(`f_${fieldname}__gte`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.gte,
        value: query[`f_${fieldname}__gte`],
      });
    }
    if (query.hasOwnProperty(`f_${fieldname}__contains`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.contains,
        value: query[`f_${fieldname}__contains`],
      });
    }
    if (query.hasOwnProperty(`f_${fieldname}__icontains`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.icontains,
        value: query[`f_${fieldname}__icontains`],
      });
    }

    if (query.hasOwnProperty(`f_${fieldname}__empty`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.empty,
        value: query[`f_${fieldname}__empty`],
      });
    }
  }
  return filteringItems;
}
