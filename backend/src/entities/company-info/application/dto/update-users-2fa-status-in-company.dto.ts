import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUsers2faStatusInCompanyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  readonly is2faEnabled: boolean;
}
