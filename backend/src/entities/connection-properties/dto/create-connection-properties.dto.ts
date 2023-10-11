import { ApiProperty } from '@nestjs/swagger';

export class CreateConnectionPropertiesDto {
  @ApiProperty({ isArray: true, type: String })
  hidden_tables: Array<string>;

  @ApiProperty()
  logo_url: string;

  @ApiProperty()
  primary_color: string;

  @ApiProperty()
  secondary_color: string;

  @ApiProperty()
  hostname: string;

  @ApiProperty()
  company_name: string;
}
