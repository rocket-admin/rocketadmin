import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponse {
	@ApiProperty()
	success: boolean;
}

export class CreatedConnectionResponse {
	@ApiProperty()
	connectionId: string;
}
