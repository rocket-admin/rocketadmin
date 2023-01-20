import { GroupEntity } from '../../group.entity.js';

export class AddedUserInGroupDs {
  group: Omit<GroupEntity, 'connection'>;
  message: string;
  external_invite: boolean;
}
