import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SetSiteRuntimePolicyDto {
	@ApiProperty({ description: 'The user on whose behalf the manifest is written — must hold connection:edit (Cedar).' })
	@IsNotEmpty()
	@IsString()
	userId: string;

	@ApiProperty({
		type: 'object',
		additionalProperties: true,
		description:
			'The site data contract (plan 13 §4): {auth, ownedRead, write}. Replaces the stored policy wholesale — ' +
			'the generation agent always proposes the complete manifest it derived from the schema it created. ' +
			'universal-backend parses it fail-closed, so unknown keys are inert and missing sections grant nothing.',
	})
	@IsObject()
	policy: Record<string, unknown>;
}
