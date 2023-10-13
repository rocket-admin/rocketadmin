import { ApiProperty } from '@nestjs/swagger';

export class FoundCompanyAddressDs {
  id: string;

  @ApiProperty({ required: false })
  street?: string;

  @ApiProperty({ required: false })
  number?: string;

  @ApiProperty({ required: false })
  complement?: string;

  @ApiProperty({ required: false })
  neighborhood?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  state?: string;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ required: false })
  zipCode?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}

export class FoundUserCompanyInfoDs {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  additional_info?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;

  @ApiProperty({ required: false })
  address?: FoundCompanyAddressDs;
}
