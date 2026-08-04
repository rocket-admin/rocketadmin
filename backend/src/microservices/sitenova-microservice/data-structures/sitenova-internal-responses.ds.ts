import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Decrypted connection credentials handed to the universal-backend service so it can open the
// customer database itself (with Knex). Serving this over the microservice-JWT channel keeps the
// core the sole owner of credential storage/decryption; the satellite never sees the core DB or
// the encryption keys. Same trust level as the existing write-capable raw-query edge.
export class SitenovaDecryptedConnectionRO {
	@ApiProperty()
	id: string;

	@ApiProperty({ description: 'Connection engine type (e.g. postgres, mysql).' })
	type: string;

	@ApiPropertyOptional()
	host?: string | null;

	@ApiPropertyOptional()
	port?: number | null;

	@ApiPropertyOptional()
	username?: string | null;

	@ApiPropertyOptional()
	password?: string | null;

	@ApiPropertyOptional()
	database?: string | null;

	@ApiPropertyOptional()
	schema?: string | null;

	@ApiPropertyOptional()
	ssl?: boolean | null;

	@ApiPropertyOptional()
	cert?: string | null;

	@ApiPropertyOptional({ description: 'True when the connection reaches the DB over an SSH tunnel.' })
	ssh?: boolean;

	@ApiPropertyOptional()
	azure_encryption?: boolean;

	@ApiPropertyOptional()
	sid?: string | null;

	@ApiPropertyOptional()
	authSource?: string | null;

	@ApiPropertyOptional()
	dataCenter?: string | null;
}

export class SitenovaConnectionForSiteRuntimeRO {
	@ApiProperty({ type: SitenovaDecryptedConnectionRO })
	connection: SitenovaDecryptedConnectionRO;

	@ApiProperty({
		description:
			'Per-connection HS256 key for generated-site end-user JWTs (created on first request). ' +
			'Lets the caller sign/verify the same tokens SitenovaEndUserAuthService does.',
	})
	endUserJwtKey: string;
}

export class SitenovaPublicReadValidationRO {
	@ApiProperty({ description: 'True when the connection public policy grants table:query on the table.' })
	allowed: boolean;

	@ApiProperty({
		type: [String],
		nullable: true,
		description: 'Publicly readable subset of the submitted columnNames; null when columnNames was not submitted.',
	})
	readableColumns: Array<string> | null;
}
