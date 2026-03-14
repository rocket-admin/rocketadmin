import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGroupInConnectionDTO {
	@IsNotEmpty()
	@IsString()
	@ApiProperty()
	title: string;

	@IsOptional()
	@IsString()
	@ApiProperty({ required: false, nullable: true })
	cedarPolicy?: string | null;
}
