import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateMasterPasswordRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  oldMasterPwd: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  newMasterPwd: string;
}
