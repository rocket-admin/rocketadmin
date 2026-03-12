import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SaveCedarPolicyDto {
	@ApiProperty({
		description: 'Cedar policy in Cedar Policy Language format',
		example: 'permit(\n  principal in RocketAdmin::Group::"group-uuid",\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"conn-uuid"\n);',
	})
	@IsNotEmpty()
	@IsString()
	cedarPolicy: string;

	@ApiProperty({
		description: 'Group ID to apply the cedar policy to',
	})
	@IsNotEmpty()
	@IsUUID()
	groupId: string;
}
