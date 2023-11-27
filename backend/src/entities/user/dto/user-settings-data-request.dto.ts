import { ApiProperty } from '@nestjs/swagger';
import { IsJSON, IsNotEmpty, IsString } from 'class-validator';

export class UserSettingsDataRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsJSON()
  userSettings: string;
}
