import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PublicTablePermissionDto {
	@ApiProperty({ description: 'Table the public users may query.' })
	@IsNotEmpty()
	@IsString()
	tableName: string;

	@ApiPropertyOptional({
		description: 'Whitelist of columns public users may read. Omit or leave empty to allow all columns.',
		type: [String],
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	readableColumns?: Array<string>;
}

export class SetPublicPermissionsDto {
	@ApiProperty({
		description:
			'Tables exposed to unauthenticated (public) users. Each entry grants QueryTable and ColumnRead. ' +
			'Pass an empty array to disable public access for the connection.',
		type: [PublicTablePermissionDto],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PublicTablePermissionDto)
	tables: Array<PublicTablePermissionDto>;
}

export class PublicPermissionsResponseDto {
	@ApiProperty({ description: 'Whether public access is enabled for this connection.' })
	enabled: boolean;

	@ApiProperty({ type: [PublicTablePermissionDto] })
	tables: Array<PublicTablePermissionDto>;
}
