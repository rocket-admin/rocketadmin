export class TableCategoryDS {
  category_name: string;
  tables: Array<string>;
}

export class CreateOrUpdateTableCategoriesDS {
  connectionId: string;
  master_password: string;
  table_categories: Array<TableCategoryDS>;
}
