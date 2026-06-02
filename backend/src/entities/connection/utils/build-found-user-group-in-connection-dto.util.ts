import { AccessLevelEnum } from '../../../enums/access-level.enum.js';
import { GroupEntity } from '../../group/group.entity.js';
import { SimpleFoundUserInfoDs } from '../../user/dto/found-user.dto.js';
import { buildSimpleUserInfoDs } from '../../user/utils/build-created-user.ds.js';
import { FoundUserGroupsInConnectionDTO } from '../application/dto/found-user-groups-in-connection.dto.js';

export function buildFoundUserGroupInConnectionDto(
	group: GroupEntity,
	accessLevel: AccessLevelEnum,
): FoundUserGroupsInConnectionDTO {
	return {
		group: {
			id: group.id,
			title: group.title,
			isMain: group.isMain,
			cedarPolicy: group.cedarPolicy,
			users: group.users?.length
				? group.users
						.map((user) => buildSimpleUserInfoDs(user))
						.filter((user): user is SimpleFoundUserInfoDs => user !== null)
				: undefined,
		},
		accessLevel,
	};
}
