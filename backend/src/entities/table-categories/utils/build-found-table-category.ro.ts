import { FoundTableCategoryRo } from '../dto/found-table-category.ro.js';
import { TableCategoriesEntity } from '../table-categories.entity.js';

export function buildFoundTableCategoryRo(tableCategory: TableCategoriesEntity): FoundTableCategoryRo {
  return {
    category_id: tableCategory.category_id,
    category_name: tableCategory.category_name,
    category_color: tableCategory.category_color,
    tables: tableCategory.tables,
  };
}
