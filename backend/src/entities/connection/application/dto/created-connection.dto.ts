import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { FoundUserDto } from '../../../user/dto/found-user.dto.js';

export class CreatedGroupInConnectionDTO {
	@ApiProperty()
	id: string;

	@ApiProperty()
	title: string;

	@ApiProperty()
	isMain: boolean;

	@ApiProperty({ isArray: true, type: FoundUserDto })
	users?: Array<FoundUserDto>;
}

export class CreatedConnectionDTO {
	@ApiProperty()
	id: string;

	@ApiProperty()
	title?: string;

	@ApiProperty()
	masterEncryption?: boolean;

	@ApiProperty({ enum: ConnectionTypesEnum })
	type?: ConnectionTypesEnum | null;

	@ApiProperty()
	host?: string | null;

	@ApiProperty()
	port?: number;

	@ApiProperty()
	username?: string | null;

	@ApiProperty()
	database?: string | null;

	@ApiProperty()
	schema?: string | null;

	@ApiProperty()
	sid?: string | null;

	@ApiProperty()
	ssh?: boolean;

	@ApiProperty()
	sshHost?: string | null;

	@ApiProperty()
	sshPort?: number | null;

	@ApiProperty()
	sshUsername?: string | null;

	@ApiProperty()
	ssl?: boolean | null;

	@ApiProperty()
	cert?: string | null;

	@ApiProperty()
	azure_encryption?: boolean;

	@ApiProperty()
	token: string | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty()
	isTestConnection: boolean;

	@ApiProperty()
	isFrozen: boolean;

	@ApiProperty()
	author?: string;

	@ApiProperty()
	authSource?: string | null;

	@ApiProperty()
	dataCenter?: string | null;

	@ApiProperty()
	master_hash?: string | null;

	@ApiProperty({ isArray: true, type: CreatedGroupInConnectionDTO })
	groups: Array<CreatedGroupInConnectionDTO>;
}
