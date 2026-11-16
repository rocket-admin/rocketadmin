import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { FoundInvitationInCompanyDs } from '../../../entities/company-info/application/data-structures/found-invitation-in-company.ds.js';
import { SimpleFoundUserInCompanyInfoDs } from '../../../entities/user/dto/found-user.dto.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';

// Bodies and responses of the internal (microservice-JWT) company-membership bridges that the SaaS
// control plane calls. Like every other `/saas/*` bridge, these do NO authorization of their own.
// The SaaS caller is responsible for the company-admin enforcement (see the comment on
// `SaasController.inviteSaasUserInCompany`).

// The invitation shape WITHOUT `verification_string`. The raw invite token is a credential: anyone
// holding it can accept the invitation and take over the invited seat. `FoundInvitationInCompanyDs`
// carries it because the core's own full-company-info response does. But nothing that the SaaS
// service relays to a browser can ever include it. So the bridge never emits it in the first place.
export class SaasFoundInvitationInCompanyDs implements Omit<FoundInvitationInCompanyDs, 'verification_string'> {
	@ApiProperty()
	id: string;

	@ApiProperty({ required: false, nullable: true, type: String })
	groupId: string | null;

	@ApiProperty({ required: false, nullable: true, type: String })
	inviterId: string | null;

	@ApiProperty({ required: false, nullable: true, type: String })
	invitedUserEmail: string | null;

	@ApiProperty({ enum: UserRoleEnum })
	role: UserRoleEnum;

	@ApiProperty()
	createdAt: Date;
}

// Active members plus still-outstanding invitations in one response. The two are served together.
// The SaaS members UI always needs both, and the core already loads the invitations on the
// same query (`findCompanyInfoWithUsersById` left-joins them).
export class SaasCompanyMembersRO {
	@ApiProperty({ type: SimpleFoundUserInCompanyInfoDs, isArray: true })
	users: Array<SimpleFoundUserInCompanyInfoDs>;

	@ApiProperty({ type: SaasFoundInvitationInCompanyDs, isArray: true })
	invitations: Array<SaasFoundInvitationInCompanyDs>;
}

export class SaasRevokeInvitationDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	email: string;
}

export class SaasUpdateUserRoleDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;

	// Note: the core's own `UpdateUserRoleRequestDto` spells this `@IsEnum({ enum: UserRoleEnum })`,
	// which passes an object literal instead of the enum and therefore validates nothing. Spelled
	// correctly here so an unknown role is rejected at the bridge.
	@ApiProperty({ enum: UserRoleEnum })
	@IsNotEmpty()
	@IsEnum(UserRoleEnum)
	role: UserRoleEnum;
}

export class SaasUpdateUsersRolesDto {
	@ApiProperty({ type: SaasUpdateUserRoleDto, isArray: true })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SaasUpdateUserRoleDto)
	users: Array<SaasUpdateUserRoleDto>;
}
