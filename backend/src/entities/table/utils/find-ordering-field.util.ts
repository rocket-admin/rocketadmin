import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { OrderingFiledDs } from '../application/data-structures/found-table-rows.ds.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Messages } from '../../../exceptions/text/messages.js';
import { QueryOrderingEnum } from '../../../enums/index.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { isObjectPropertyExists } from '../../../helpers/validators/is-object-property-exists-validator.js';

export function findOrderingFieldUtil(
  query: Record<string, unknown>,
  tableStructure: Array<TableStructureDS>,
  tableSettings: TableSettingsEntity,
): OrderingFiledDs | undefined {
  if (!isObjectPropertyExists(query, 'sort_by') || !isObjectPropertyExists(query, 'sort_order')) {
    return undefined;
  }

  const sortByFieldName = query['sort_by'] as string;
  const sortByOrder = query['sort_order'] as QueryOrderingEnum;

  const rowNames = new Set(tableStructure.map((el) => el.column_name));

  if (!rowNames.has(sortByFieldName)) {
    throw new HttpException(
      {
        message: Messages.EXCLUDED_OR_NOT_EXISTS(sortByFieldName),
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (tableSettings?.sortable_by?.length && !tableSettings.sortable_by.includes(sortByFieldName)) {
    throw new HttpException(
      {
        message: Messages.FIELD_MUST_BE_SORTABLE(sortByFieldName),
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!Object.values(QueryOrderingEnum).includes(sortByOrder)) {
    throw new HttpException(
      {
        message: Messages.ORDERING_FIELD_INCORRECT,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  return {
    field: sortByFieldName,
    value: sortByOrder,
  };
}
