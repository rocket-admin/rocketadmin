import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetHostedConnectionCredentialsDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	hostedDatabaseId: string;
}
