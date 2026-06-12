import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateUserTokenDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	token: string;
}

export class ValidateTableAiRequestDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	userId: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	connectionId: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;
}

export class ValidateConnectionEditDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	userId: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	connectionId: string;
}
