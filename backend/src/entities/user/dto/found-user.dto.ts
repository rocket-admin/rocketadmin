import { ApiProperty } from '@nestjs/swagger';
import { ExternalRegistrationProviderEnum } from '../enums/external-registration-provider.enum.js';
import { UserRoleEnum } from '../enums/user-role.enum.js';

export class CompanyIdDS {
  @ApiProperty()
  id: string;
}

export class FoundUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty()
  suspended: boolean;

  @ApiProperty({ required: false, type: String })
  intercom_hash?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  is_2fa_enabled: boolean;

  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;

  @ApiProperty({ required: false })
  company?: CompanyIdDS;

  @ApiProperty({ enum: ExternalRegistrationProviderEnum })
  externalRegistrationProvider: ExternalRegistrationProviderEnum;

  @ApiProperty({ default: true })
  show_test_connections: boolean;
}

export class SimpleFoundUserInfoDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  suspended: boolean;

  @ApiProperty()
  name: string;

  @ApiProperty()
  is_2fa_enabled: boolean;

  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;

  @ApiProperty({ enum: ExternalRegistrationProviderEnum })
  externalRegistrationProvider: ExternalRegistrationProviderEnum;
}

export class UserGroupMembershipDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;
}

export class UserConnectionMembershipDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  database: string;

  @ApiProperty({ type: UserConnectionMembershipDto, isArray: true })
  groups: Array<UserGroupMembershipDto>;
}

export class SimpleFoundUserInCompanyInfoDs extends SimpleFoundUserInfoDs {
  @ApiProperty()
  has_groups: boolean;

  @ApiProperty({ type: UserConnectionMembershipDto, isArray: true })
  user_membership: Array<UserConnectionMembershipDto>;
}
