import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto/index.js';
import { QueryOrderingEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { isObjectEmpty } from '../is-object-empty.js';

export function tableSettingsFieldValidator(
  tableStructure: any,
  primaryColumns: Array<PrimaryKeyDS>,
  settings: CreateTableSettingsDto,
): Array<string> {
   
  const errorMessages = [];
  if (isObjectEmpty(settings)) {
    return errorMessages;
  }
  const {
    search_fields,
    excluded_fields,
    list_fields,
    readonly_fields,
    sortable_by,
    ordering_field,
    ordering,
    list_per_page,
    identification_fields,
    columns_view,
    identity_column,
  } = settings;

  const columnNames = tableStructure.map((column) => {
    return column.column_name;
  });
  //*******************************************
  if (search_fields && !Array.isArray(search_fields)) {
    errorMessages.push(Messages.MUST_BE_ARRAY(`search_fields`));
  }

  if (excluded_fields && !Array.isArray(excluded_fields)) {
    errorMessages.push(Messages.MUST_BE_ARRAY(`excluded_fields`));
  }

  if (list_fields && !Array.isArray(list_fields)) {
    errorMessages.push(Messages.MUST_BE_ARRAY(`list_fields`));
  }

  if (identification_fields && !Array.isArray(identification_fields)) {
    errorMessages.push(Messages.MUST_BE_ARRAY('identification_fields'));
  }

  if (readonly_fields && !Array.isArray(readonly_fields)) {
    errorMessages.push(Messages.MUST_BE_ARRAY(`readonly_fields`));
  }

  if (sortable_by && !Array.isArray(sortable_by)) {
    errorMessages.push(Messages.MUST_BE_ARRAY(`sortable_by`));
  }

  if (columns_view && !Array.isArray(columns_view)) {
    errorMessages.push(Messages.MUST_BE_ARRAY(`columns_view`));
  }

  if (errorMessages.length > 0) {
    return errorMessages;
  }

  //*********************************************
  function excludedFields(checkedFields: Array<string>, existingFields: Array<string>): Array<string> {
    const excludedFields = [];
    if (!checkedFields) {
      return excludedFields;
    }
    for (const checkedField of checkedFields) {
      if (!checkedField) {
        continue;
      }
      if (!existingFields.includes(checkedField)) {
        excludedFields.push(checkedField);
      }
    }
    return excludedFields;
  }

  const errors = Array.prototype.concat(
    excludedFields(search_fields, columnNames),
    excludedFields(excluded_fields, columnNames),
    excludedFields(list_fields, columnNames),
    excludedFields(identification_fields, columnNames),
    excludedFields(readonly_fields, columnNames),
    excludedFields(sortable_by, columnNames),
    excludedFields([ordering_field], columnNames),
    excludedFields(columns_view, columnNames),
    excludedFields([identity_column], columnNames),
  );

  if (errors.length > 0) {
    errorMessages.push(Messages.NO_SUCH_FIELDS_IN_TABLES(errors, settings.table_name));
  }

  if (ordering) {
    if (!Object.keys(QueryOrderingEnum).find((key) => key === ordering)) {
      errorMessages.push(Messages.ORDERING_FIELD_INCORRECT);
    }
  }

  if ((list_per_page && list_per_page < 0) || list_per_page === 0) {
    errorMessages.push(Messages.LIST_PER_PAGE_INCORRECT);
  }

  if (excluded_fields) {
    for (const field of search_fields) {
      const index = excluded_fields.indexOf(field);
      if (index >= 0) {
        errorMessages.push(Messages.CANT_LIST_AND_EXCLUDE(field));
      }
    }

    const orderingFieldIndex = excluded_fields.indexOf(ordering_field);
    if (orderingFieldIndex >= 0) {
      errorMessages.push(Messages.CANT_ORDER_AND_EXCLUDE);
    }

    if (readonly_fields && readonly_fields.length > 0) {
      for (const field of readonly_fields) {
        const index = excluded_fields.indexOf(field);
        if (index >= 0) {
          errorMessages.push(Messages.CANT_READONLY_AND_EXCLUDE(field));
        }
      }
    }

    if (columns_view && columns_view.length > 0) {
      for (const field of columns_view) {
        const index = excluded_fields.indexOf(field);
        if (index >= 0) {
          errorMessages.push(Messages.CANT_VIEW_AND_EXCLUDE(field));
        }
      }
    }

    if (primaryColumns && primaryColumns.length > 0) {
      for (const column of primaryColumns) {
        const index = excluded_fields.indexOf(column.column_name);
        if (index >= 0) {
          errors.push(Messages.CANT_EXCLUDE_PRIMARY_KEY(column.column_name));
        }
      }
    }
  }

  return errorMessages;
   
}
