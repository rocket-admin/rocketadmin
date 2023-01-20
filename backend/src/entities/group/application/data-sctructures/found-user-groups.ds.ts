import { AccessLevelEnum } from '../../../../enums/index.js';

export class FoundUserGroupsDs {
  groups: Array<{
    group: {
      id: string;
      title: string;
      isMain: boolean;
    };
    accessLevel: AccessLevelEnum;
  }>;
  groupsCount: number;
}
