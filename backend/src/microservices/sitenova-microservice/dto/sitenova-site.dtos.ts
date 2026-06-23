import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

class SitenovaAuthBaseDto {
	@ApiProperty({ description: 'Name of the users/auth table in the connected database.' })
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty({ description: 'End-user identifier (matched against the email column).' })
	@IsString()
	@IsNotEmpty()
	email: string;

	@ApiPropertyOptional({ description: 'Override the email column name (default: "email").' })
	@IsOptional()
	@IsString()
	emailField?: string;

	@ApiPropertyOptional({ description: 'Override the password column name (default: "password").' })
	@IsOptional()
	@IsString()
	passwordField?: string;
}

export class SitenovaRegisterDto extends SitenovaAuthBaseDto {
	@ApiProperty({ description: 'End-user password (stored hashed; min 6 chars).' })
	@IsString()
	@MinLength(6)
	password: string;

	@ApiPropertyOptional({ type: Object, description: 'Additional columns to set on the new user row.' })
	@IsOptional()
	@IsObject()
	extra?: Record<string, unknown>;
}

export class SitenovaLoginDto extends SitenovaAuthBaseDto {
	@ApiProperty({ description: 'End-user password.' })
	@IsString()
	@IsNotEmpty()
	password: string;
}

export class SitenovaSiteCreateRowDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty({ type: Object })
	@IsObject()
	row: Record<string, unknown>;
}

export class SitenovaSiteGetRowsDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsInt()
	page?: number;

	@ApiPropertyOptional()
	@IsOptional()
	@IsInt()
	perPage?: number;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({ type: Object })
	@IsOptional()
	@IsObject()
	filters?: Record<string, unknown>;
}

export class SitenovaSiteRowByPrimaryKeyDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@ApiProperty({ type: Object })
	@IsObject()
	primaryKey: Record<string, unknown>;
}

export class SitenovaSiteUpdateRowDto extends SitenovaSiteRowByPrimaryKeyDto {
	@ApiProperty({ type: Object })
	@IsObject()
	row: Record<string, unknown>;
}

export class SitenovaEndUserAuthResponseDto {
	@ApiProperty({ description: 'End-user JWT to send as Bearer on write requests.' })
	token: string;

	@ApiProperty({ type: Object, description: 'The authenticated user row (password field stripped).' })
	user: Record<string, unknown>;
}
