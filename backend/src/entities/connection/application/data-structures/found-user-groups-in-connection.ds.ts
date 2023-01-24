import { GroupEntity } from '../../../group/group.entity.js';
import { AccessLevelEnum } from '../../../../enums/index.js';

export class FoundUserGroupsInConnectionDs {
  group: Omit<GroupEntity, 'connection' | 'users'>;
  accessLevel: AccessLevelEnum;
}
