import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SitenovaBaseDto {
	@ApiProperty({ description: 'Id of the RocketAdmin user the operation is performed on behalf of.' })
	@IsString()
	@IsNotEmpty()
	@IsUUID()
	userId: string;

	@ApiPropertyOptional({ description: 'Master password for connections stored with encryption.' })
	@IsOptional()
	@IsString()
	masterPassword?: string | null;
}

export class SitenovaExecuteRawQueryDto extends SitenovaBaseDto {
	@ApiProperty({ description: 'Raw SQL statement to execute (DDL/DML allowed).' })
	@IsString()
	@IsNotEmpty()
	query: string;

	@ApiPropertyOptional({
		description: 'Optional table/collection name. Required only by engines whose raw-query API is table-scoped.',
	})
	@IsOptional()
	@IsString()
	tableName?: string | null;
}

export class SitenovaValidatePublicReadDto {
	@ApiProperty({ description: 'Table the anonymous read targets.' })
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiPropertyOptional({
		type: [String],
		description: 'When provided, the response includes the publicly readable subset of these columns.',
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	columnNames?: Array<string>;
}
