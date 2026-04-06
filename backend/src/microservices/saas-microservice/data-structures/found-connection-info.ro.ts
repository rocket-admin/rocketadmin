import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export class FoundConnectionInfoRO {
	@ApiProperty()
	id: string;

	@ApiProperty()
	title: string;

	@ApiProperty({ enum: ConnectionTypesEnum })
	type: ConnectionTypesEnum;

	@ApiProperty()
	host: string;

	@ApiProperty()
	port: number;

	@ApiProperty()
	database: string;

	@ApiProperty()
	schema: string;

	@ApiProperty()
	sid: string;

	@ApiProperty()
	ssh: boolean;

	@ApiProperty()
	ssl: boolean;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty()
	isTestConnection: boolean;

	@ApiProperty()
	is_frozen: boolean;

	@ApiProperty()
	masterEncryption: boolean;

	@ApiProperty()
	azure_encryption: boolean;

	@ApiProperty()
	authSource: string;

	@ApiProperty()
	dataCenter: string | null;
}
