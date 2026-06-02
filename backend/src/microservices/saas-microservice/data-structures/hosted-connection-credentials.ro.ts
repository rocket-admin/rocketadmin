import { ApiProperty } from '@nestjs/swagger';

export class HostedConnectionCredentialsRO {
	@ApiProperty()
	connectionId: string;

	@ApiProperty()
	host?: string | null;

	@ApiProperty()
	port?: number;

	@ApiProperty()
	database?: string | null;

	@ApiProperty()
	username?: string | null;

	@ApiProperty()
	password?: string | null;

	@ApiProperty()
	is_frozen: boolean;
}
