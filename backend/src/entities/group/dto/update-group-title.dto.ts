import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateGroupTitleDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	title: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@IsUUID()
	groupId: string;

	@IsOptional()
	@IsString()
	@ApiProperty({ required: false, nullable: true })
	cedarPolicy?: string | null;
}
