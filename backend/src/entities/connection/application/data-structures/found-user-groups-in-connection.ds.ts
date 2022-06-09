import { GroupEntity } from '../../../group/group.entity';
import { AccessLevelEnum } from '../../../../enums';

export class FoundUserGroupsInConnectionDs {
  group: Omit<GroupEntity, 'connection' | 'users'>;
  accessLevel: AccessLevelEnum;
}
