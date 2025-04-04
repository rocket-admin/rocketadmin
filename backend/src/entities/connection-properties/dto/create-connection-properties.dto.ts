import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConnectionPropertiesDto {
  @IsOptional()
  @IsArray()
  @ApiProperty({ isArray: true, type: String, required: false })
  hidden_tables: Array<string>;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  logo_url: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  primary_color: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  secondary_color: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  hostname: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  company_name: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  tables_audit: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  human_readable_table_names: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  allow_ai_requests: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ required: false })
  default_showing_table: string;
}
