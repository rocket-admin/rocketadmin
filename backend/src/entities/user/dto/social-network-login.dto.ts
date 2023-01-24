import { IsNotEmpty } from 'class-validator';

export class SocialNetworkLoginDto {
  @IsNotEmpty()
  token: string;
}
