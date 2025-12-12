export class TableCategoryDS {
  category_name: string;
  category_color: string;
  category_id: string;
  tables: Array<string>;
}

export class CreateOrUpdateTableCategoriesDS {
  connectionId: string;
  master_password: string;
  table_categories: Array<TableCategoryDS>;
}
