import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../enums/user-role.enum.js';
import { ExternalRegistrationProviderEnum } from '../../enums/external-registration-provider.enum.js';

export class CompanyIdDS {
  @ApiProperty()
  id: string;
}

export class FoundUserDs {
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

  @ApiProperty({ required: false })
  intercom_hash?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  is_2fa_enabled: boolean;

  @ApiProperty()
  role: UserRoleEnum;

  @ApiProperty({ required: false })
  company?: CompanyIdDS;

  @ApiProperty()
  externalRegistrationProvider: ExternalRegistrationProviderEnum;
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

  @ApiProperty()
  role: UserRoleEnum;

  @ApiProperty()
  externalRegistrationProvider: ExternalRegistrationProviderEnum;
}
