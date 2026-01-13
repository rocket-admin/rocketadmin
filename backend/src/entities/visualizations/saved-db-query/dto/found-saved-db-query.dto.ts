import { ApiProperty } from '@nestjs/swagger';

export class FoundSavedDbQueryDto {
	@ApiProperty({ type: String, description: 'The entity id' })
	id: string;

	@ApiProperty({ type: String, description: 'The name of the saved query' })
	name: string;

	@ApiProperty({ type: String, description: 'The description of the saved query', nullable: true })
	description: string | null;

	@ApiProperty({ type: String, description: 'The SQL query text' })
	query_text: string;

	@ApiProperty({ type: String, description: 'The connection id' })
	connection_id: string;

	@ApiProperty({ type: Date, description: 'The creation date' })
	created_at: Date;

	@ApiProperty({ type: Date, description: 'The last update date' })
	updated_at: Date;
}
