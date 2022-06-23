import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { OrderingFiledDs } from '../application/data-structures/found-table-rows.ds';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Messages } from '../../../exceptions/text/messages';
import { QueryOrderingEnum } from '../../../enums';
import { ITableStructure } from '../../../data-access-layer/shared/data-access-object-interface';

export function findOrderingFieldUtil(
  query: string,
  tableStructure: Array<ITableStructure>,
  tableSettings: TableSettingsEntity,
): OrderingFiledDs {
  const rowNames = tableStructure.map((el) => {
    return el.column_name;
  });
  let orderingField = undefined;
  if (query.hasOwnProperty('sort_by') && query.hasOwnProperty('sort_order')) {
    const sortByFieldName = query['sort_by'] as string;
    const sortByOrder = query['sort_order'] as QueryOrderingEnum;
    const sortFieldIndex = rowNames.indexOf(sortByFieldName);
    if (sortFieldIndex < 0) {
      throw new HttpException(
        {
          message: Messages.EXCLUDED_OR_NOT_EXISTS(sortByFieldName),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tableSettings?.sortable_by && tableSettings?.sortable_by.length > 0) {
      const sortFieldIndex = tableSettings.sortable_by.indexOf(sortByFieldName);
      if (sortFieldIndex < 0) {
        throw new HttpException(
          {
            message: Messages.FIELD_MUST_BE_SORTABLE(sortByFieldName),
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (!Object.keys(QueryOrderingEnum).find((key) => key === sortByOrder)) {
      throw new HttpException(
        {
          message: Messages.ORDERING_FIELD_INCORRECT,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    orderingField = {
      field: sortByFieldName,
      value: sortByOrder,
    };
  }

  return orderingField;
}
