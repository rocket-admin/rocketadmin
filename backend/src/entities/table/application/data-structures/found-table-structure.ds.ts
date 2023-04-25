import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';

export class FoundTableStructureDs {
  structure: Array<FullTableStructureDs>;
  primaryColumns: Array<PrimaryKeyDS>;
  foreignKeys: Array<ForeignKeyDS>;
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
