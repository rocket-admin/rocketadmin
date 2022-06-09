import { GroupEntity } from '../../group.entity';

export class AddedUserInGroupDs {
  group: Omit<GroupEntity, 'connection'>;
  message: string;
  external_invite: boolean;
}
