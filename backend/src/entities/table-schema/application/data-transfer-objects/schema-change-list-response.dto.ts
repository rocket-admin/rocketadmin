import { ApiProperty } from '@nestjs/swagger';
import { PaginationDs } from '../../../table/application/data-structures/pagination.ds.js';
import { SchemaChangeResponseDto } from './schema-change-response.dto.js';

export class SchemaChangeListResponseDto {
	@ApiProperty({ type: SchemaChangeResponseDto, isArray: true })
	data: SchemaChangeResponseDto[];

	@ApiProperty({ type: PaginationDs })
	pagination: PaginationDs;
}
