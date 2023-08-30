import { AccessLevelEnum } from '../../../../enums/index.js';

export class FoundPermissionsInConnectionDs {
  connection: {
    connectionId: string;
    accessLevel: AccessLevelEnum;
  };
  group: {
    groupId: string;
    accessLevel: AccessLevelEnum;
  };
  tables: Array<{
    tableName: string;
    display_name: string;
    accessLevel: {
      visibility: boolean;
      readonly: boolean;
      add: boolean;
      delete: boolean;
      edit: boolean;
    };
  }>;
}
