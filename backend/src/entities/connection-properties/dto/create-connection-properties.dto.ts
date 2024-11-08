import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateConnectionPropertiesDto {
  @IsOptional()
  @IsArray()
  @ApiProperty({ isArray: true, type: String })
  hidden_tables: Array<string>;

  @IsOptional()
  @IsString()
  @ApiProperty()
  logo_url: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  primary_color: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  secondary_color: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  hostname: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  company_name: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  tables_audit: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  human_readable_table_names: boolean;
}
