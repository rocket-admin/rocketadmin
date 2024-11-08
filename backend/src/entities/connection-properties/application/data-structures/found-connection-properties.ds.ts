import { ApiProperty } from '@nestjs/swagger';

export class FoundConnectionPropertiesDs {
  @ApiProperty()
  id: string;

  @ApiProperty({ isArray: true, type: String })
  hidden_tables: Array<string>;

  @ApiProperty()
  connectionId: string;

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

  @ApiProperty()
  tables_audit: boolean;

  @ApiProperty()
  human_readable_table_names: boolean;
}
