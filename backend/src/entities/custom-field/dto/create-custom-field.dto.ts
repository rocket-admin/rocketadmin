import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateCustomFieldDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsString()
  template_string: string;
}

export class UpdateCustomFieldDTO extends CreateCustomFieldDto {
  @IsString()
  @IsUUID()
  @ApiProperty()
  id: string;
}
