import { ApiProperty } from '@nestjs/swagger';
import { ExternalRegistrationProviderEnum } from '../../enums/external-registration-provider.enum.js';

export class FoundUserInGroupDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  name: string;

  @ApiProperty()
  suspended: boolean;

  @ApiProperty()
  externalRegistrationProvider: ExternalRegistrationProviderEnum;
}
