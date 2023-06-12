export class FoundTableDs {
  display_name?: string;
  table: string;
  isView: boolean;
  icon: string;
  permissions: {
    add: boolean;
    delete: boolean;
    edit: boolean;
    readonly: boolean;
    visibility: boolean;
  };
}
