import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class DeleteConnectionForHostedDbDto {
	@ApiProperty({
		description: 'Company ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	companyId: string;

	@ApiProperty({
		description: 'Hosted db entity ID',
	})
	@IsNotEmpty()
	@IsString()
	hostedDatabaseId: string;

	@ApiProperty({
		description: 'Database name',
		example: 'my_database',
	})
	databaseName: string;
}
