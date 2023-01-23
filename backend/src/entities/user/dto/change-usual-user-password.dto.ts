import { IsNotEmpty } from 'class-validator';

export class ChangeUsualUserPasswordDto {
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  oldPassword: string;

  @IsNotEmpty()
  newPassword: string;
}
