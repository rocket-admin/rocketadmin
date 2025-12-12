import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTableCategoryDto {
  @ApiProperty({ type: String, maxLength: 255, example: 'Category 1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  category_name: string;

  @ApiProperty({ type: String, maxLength: 255, example: '#FF5733' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  category_color: string;

  @ApiProperty({ type: String, example: ['table1', 'table2'], isArray: true })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  tables: string[];

  @ApiProperty({ type: String, maxLength: 255, example: 'cat-001' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  category_id: string;
}
