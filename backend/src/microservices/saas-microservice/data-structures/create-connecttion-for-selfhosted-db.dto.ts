import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateConnectionForHostedDbDto {
	@ApiProperty({
		description: 'Company ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@IsString()
	@IsNotEmpty()
	@IsUUID()
	companyId: string;

	@ApiProperty({
		description: 'User ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@IsString()
	@IsNotEmpty()
	@IsUUID()
	userId: string;

	@ApiProperty({
		description: 'Database name',
		example: 'my_database',
	})
	@IsString()
	@IsNotEmpty()
	databaseName: string;

	@ApiProperty({
		description: 'Database hostname',
		example: 'localhost',
	})
	@IsString()
	@IsNotEmpty()
	hostname: string;

	@ApiProperty({
		description: 'Database port',
		example: 5432,
	})
	@IsNotEmpty()
	@IsNumber()
	@Max(65535)
	@Min(1)
	port: number;

	@ApiProperty({
		description: 'Database username',
		example: 'db_user',
	})
	@IsString()
	@IsNotEmpty()
	username: string;

	@ApiProperty({
		description: 'Database password',
		example: 'secure_password',
	})
	@IsString()
	@IsNotEmpty()
	password: string;
}
