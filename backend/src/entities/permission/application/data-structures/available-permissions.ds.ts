import { ApiProperty } from '@nestjs/swagger';

export class AvailablePermissionDs {
	@ApiProperty()
	value: string;

	@ApiProperty()
	label: string;

	@ApiProperty()
	shortLabel: string;

	@ApiProperty()
	icon: string;

	@ApiProperty({ required: false })
	resource?: string;
}

export class AvailablePermissionGroupDs {
	@ApiProperty()
	group: string;

	@ApiProperty({ isArray: true, type: AvailablePermissionDs })
	actions: Array<AvailablePermissionDs>;
}

export class AvailablePermissionsResponseDs {
	@ApiProperty({ isArray: true, type: AvailablePermissionGroupDs })
	groups: Array<AvailablePermissionGroupDs>;
}
