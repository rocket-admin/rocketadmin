import { ApiProperty } from '@nestjs/swagger';
import { TableAccessLevelsDs } from '../../../permission/application/data-structures/create-permissions.ds.js';
import { FoundTableCategoryRo } from '../../../table-categories/dto/found-table-category.ro.js';

export class FoundTableDs {
  @ApiProperty()
  display_name?: string;

  @ApiProperty()
  table: string;

  @ApiProperty()
  isView: boolean;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  permissions: TableAccessLevelsDs;
}

export class FoundTablesWithCategoriesDS {
  @ApiProperty({ type: FoundTableDs, isArray: true })
  tables: Array<FoundTableDs>;

  @ApiProperty({ type: FoundTableCategoryRo, isArray: true })
  table_categories: FoundTableCategoryRo[];
}
