import { QueryOrderingEnum } from '../../data-access-layer/shared/enums/query-ordering.enum.js';
import { enumToString } from '../../helpers/enum-to-string.js';

export const TABLE_SETTINGS_VALIDATION_ERRORS = {
  MUST_BE_ARRAY: (fieldName: string) => `The field "${fieldName}" must be an array`,
  NO_SUCH_FIELDS_IN_TABLES: (fields: Array<string>, tableName: string) =>
    `There are no such fields: ${fields.join(', ')} - in the table "${tableName}"`,
  ORDERING_FIELD_INCORRECT: `Value of sorting order is incorrect. You can choose from values ${enumToString(
    QueryOrderingEnum,
  )}`,
  LIST_PER_PAGE_INCORRECT: `You can't display less than one row per page`,
  CANT_LIST_AND_EXCLUDE: (fieldName: string) =>
    `You cannot select the same field ${fieldName ? fieldName : 'names'} to list and exclude`,
  CANT_ORDER_AND_EXCLUDE: `You cannot select the same field names to order and exclude`,
  CANT_READONLY_AND_EXCLUDE: (fieldName: string) =>
    `You cannot select the same field ${fieldName ? fieldName : 'names'} to be readonly and exclude`,
  CANT_EXCLUDE_PRIMARY_KEY: (key: string) => `You cannot exclude primary key ${key}`,
  CANT_VIEW_AND_EXCLUDE: (fieldName: string) =>
    `You cannot select the same field ${fieldName ? fieldName : 'names'} to view and exclude`,
};
