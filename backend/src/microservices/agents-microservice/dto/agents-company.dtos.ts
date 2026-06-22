import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetCompanySubscriptionInfoDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	userId: string;
}
