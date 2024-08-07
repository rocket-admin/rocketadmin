import { buildSimpleUserInfoDs } from '../../user/utils/build-created-user.ds.js';
import { FoundGroupResponseDto } from '../dto/found-group-response.dto.js';
import { GroupEntity } from '../group.entity.js';

export function buildFoundGroupResponseDto(group: GroupEntity): FoundGroupResponseDto {
  return {
    id: group.id,
    title: group.title,
    isMain: group.isMain,
    users: group.users?.map((user) => buildSimpleUserInfoDs(user)),
  };
}
