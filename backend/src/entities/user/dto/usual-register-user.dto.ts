import { IsNotEmpty } from 'class-validator';

export class UsualRegisterUserDto {
  @IsNotEmpty()
  readonly email: string;

  @IsNotEmpty()
  readonly password: string;

  @IsNotEmpty()
  readonly name: string;
}
