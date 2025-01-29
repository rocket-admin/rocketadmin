/* eslint-disable security/detect-object-injection */
import { FilteringFieldsDs } from '../application/data-structures/found-table-rows.ds.js';
import { FilterCriteriaEnum } from '../../../enums/index.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { validateStringWithEnum } from '../../../helpers/validators/validate-string-with-enum.js';
import { isObjectPropertyExists } from '../../../helpers/validators/is-object-property-exists-validator.js';

export function findFilteringFieldsUtil(
  filters: Record<string, unknown>,
  tableStructure: Array<TableStructureDS>,
): Array<FilteringFieldsDs> {
  const rowNames = tableStructure.map((el) => {
    return el.column_name;
  });
  const filteringItems = [];
  for (const fieldname of rowNames) {
    if (isObjectPropertyExists(filters, `f_${fieldname}__eq`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.eq,
        value: filters[`f_${fieldname}__eq`],
      });
    }

    if (isObjectPropertyExists(filters, `f_${fieldname}__startswith`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.startswith,
        value: filters[`f_${fieldname}__startswith`],
      });
    }
    if (isObjectPropertyExists(filters, `f_${fieldname}__endswith`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.endswith,
        value: filters[`f_${fieldname}__endswith`],
      });
    }
    if (isObjectPropertyExists(filters, `f_${fieldname}__gt`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.gt,
        value: filters[`f_${fieldname}__gt`],
      });
    }
    if (isObjectPropertyExists(filters, `f_${fieldname}__lt`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.lt,
        value: filters[`f_${fieldname}__lt`],
      });
    }
    if (isObjectPropertyExists(filters, `f_${fieldname}__lte`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.lte,
        value: filters[`f_${fieldname}__lte`],
      });
    }
    if (isObjectPropertyExists(filters, `f_${fieldname}__gte`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.gte,
        value: filters[`f_${fieldname}__gte`],
      });
    }
    if (isObjectPropertyExists(filters, `f_${fieldname}__contains`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.contains,
        value: filters[`f_${fieldname}__contains`],
      });
    }
    if (isObjectPropertyExists(filters, `f_${fieldname}__icontains`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.icontains,
        value: filters[`f_${fieldname}__icontains`],
      });
    }

    if (isObjectPropertyExists(filters, `f_${fieldname}__empty`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.empty,
        value: filters[`f_${fieldname}__empty`],
      });
    }
  }
  return filteringItems;
}

export function parseFilteringFieldsFromBodyData(
  filtersDataFromBody: Record<string, any>,
  tableStructure: Array<TableStructureDS>,
): Array<FilteringFieldsDs> {
  const filteringItems: Array<FilteringFieldsDs> = [];
  const rowNames = tableStructure.map((el) => el.column_name);
  rowNames.forEach((rowName) => {
    if (isObjectPropertyExists(filtersDataFromBody, rowName)) {
      for (const key in filtersDataFromBody[rowName]) {
        if (!validateStringWithEnum(key, FilterCriteriaEnum)) {
          throw new Error(`Invalid filter criteria: "${key}".`);
        }
        const isValueNull = filtersDataFromBody[rowName][key] === null && key === FilterCriteriaEnum.eq;
        filteringItems.push({
          field: rowName,
          criteria: isValueNull ? FilterCriteriaEnum.empty : (key as FilterCriteriaEnum),
          value: filtersDataFromBody[rowName][key],
        });
      }
    }
  });
  return filteringItems;
}
