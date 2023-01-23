import { IPrimaryKeyInfo } from '../../../../dal/shared/dao-interface.js';
import { IForeignKeyInfo } from '../../table.interface.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class FoundTableStructureDs {
  structure: Array<FullTableStructureDs>;
  primaryColumns: Array<IPrimaryKeyInfo>;
  foreignKeys: Array<IForeignKeyInfo>;
  readonly_fields: Array<string>;
  table_widgets: Array<TableWidgetEntity>;
}

export class FullTableStructureDs {
  column_name: string;
  column_default: string | number;
  data_type: string;
  data_type_params: string;
  isExcluded: boolean;
  isSearched: boolean;
  auto_increment: boolean;
  allow_null: boolean;
  character_maximum_length: number;
}
