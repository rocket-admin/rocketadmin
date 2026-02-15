import { ApiProperty } from '@nestjs/swagger';
import { ExternalRegistrationProviderEnum } from '../../enums/external-registration-provider.enum.js';
import { IToken } from '../../utils/generate-gwt-token.js';

export class RegisteredUserDs {
	@ApiProperty()
	id: string;

	@ApiProperty()
	email: string;

	@ApiProperty()
	token: IToken;

	@ApiProperty()
	name: string;

	@ApiProperty()
	externalRegistrationProvider: ExternalRegistrationProviderEnum;
}
