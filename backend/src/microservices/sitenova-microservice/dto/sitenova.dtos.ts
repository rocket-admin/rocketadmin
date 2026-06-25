import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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
