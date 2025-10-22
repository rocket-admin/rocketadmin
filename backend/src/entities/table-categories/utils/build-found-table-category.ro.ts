import { FoundTableCategoryRo } from '../dto/found-table-category.ro.js';
import { TableCategoriesEntity } from '../table-categories.entity.js';

export function buildFoundTableCategoryRo(tableCategory: TableCategoriesEntity): FoundTableCategoryRo {
  return {
    id: tableCategory.id,
    category_name: tableCategory.category_name,
    tables: tableCategory.tables,
  };
}
