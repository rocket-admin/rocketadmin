import { ApiProperty } from '@nestjs/swagger';

export class AvailablePermissionDs {
	@ApiProperty()
	value: string;

	@ApiProperty({ required: false })
	resource?: string;
}

export class AvailablePermissionsResponseDs {
	@ApiProperty({ isArray: true, type: AvailablePermissionDs })
	actions: Array<AvailablePermissionDs>;
}
