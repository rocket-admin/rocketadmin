import { ApiProperty } from '@nestjs/swagger';

export class IsConfiguredRo {
	@ApiProperty({ example: true, description: 'Indicates whether the self-hosted instance is configured' })
	public isConfigured: boolean;
}
