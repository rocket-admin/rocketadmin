import { ApiProperty } from '@nestjs/swagger';

export class HostedConnectionCredentialsRO {
	@ApiProperty()
	connectionId: string;

	@ApiProperty()
	host: string;

	@ApiProperty()
	port: number;

	@ApiProperty()
	database: string;

	@ApiProperty()
	username: string;

	@ApiProperty()
	password: string;

	@ApiProperty()
	is_frozen: boolean;
}
