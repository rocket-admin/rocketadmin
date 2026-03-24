import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeleteConnectionReasonDto {
	@IsOptional()
	@IsString()
	@ApiProperty({ required: false })
	reason?: string;

	@IsOptional()
	@IsString()
	@ApiProperty({ required: false })
	message?: string;
}
