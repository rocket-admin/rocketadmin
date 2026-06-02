import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export class FoundConnectionInfoRO {
	@ApiProperty()
	id: string;

	@ApiProperty()
	title?: string;

	@ApiProperty({ enum: ConnectionTypesEnum })
	type?: ConnectionTypesEnum | null;

	@ApiProperty()
	host?: string | null;

	@ApiProperty()
	port?: number;

	@ApiProperty()
	database?: string | null;

	@ApiProperty()
	schema?: string | null;

	@ApiProperty()
	sid?: string | null;

	@ApiProperty()
	ssh?: boolean;

	@ApiProperty()
	ssl?: boolean | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty()
	isTestConnection: boolean;

	@ApiProperty()
	is_frozen: boolean;

	@ApiProperty()
	masterEncryption?: boolean;

	@ApiProperty()
	azure_encryption?: boolean;

	@ApiProperty()
	authSource?: string | null;

	@ApiProperty()
	dataCenter?: string | null;
}
