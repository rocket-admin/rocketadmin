import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PublicTablePermissionDto } from '../../../entities/cedar-authorization/dto/public-permissions.dto.js';

export class SetAgentsPublicPermissionsDto {
	@ApiProperty({ description: 'The user on whose behalf the grant is made — must hold connection:edit (Cedar).' })
	@IsNotEmpty()
	@IsString()
	userId: string;

	@ApiProperty({
		description:
			'Tables to expose to unauthenticated (public) users. With mode=merge (default) they are UNIONED into the ' +
			'existing public permissions; with mode=replace they become the whole set (empty array disables public access).',
		type: [PublicTablePermissionDto],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PublicTablePermissionDto)
	tables: Array<PublicTablePermissionDto>;

	@ApiPropertyOptional({ enum: ['merge', 'replace'], default: 'merge' })
	@IsOptional()
	@IsIn(['merge', 'replace'])
	mode?: 'merge' | 'replace';
}
