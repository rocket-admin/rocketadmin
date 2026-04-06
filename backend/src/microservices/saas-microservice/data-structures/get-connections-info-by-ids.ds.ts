import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class GetConnectionsInfoByIdsDS {
	@ApiProperty({ type: [String] })
	@IsArray()
	@IsNotEmpty()
	@IsString({ each: true })
	connectionIds: Array<string>;
}
