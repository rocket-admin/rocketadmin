import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class ConnectionDiagramPreviewRequestDTO {
	@ApiProperty({
		type: [String],
		description:
			'Array of SQL DDL statements (CREATE TABLE, ALTER TABLE, DROP TABLE) to apply to the diagram preview. Statements are parsed and applied to an in-memory copy of the schema; nothing is executed against the real database.',
		example: ['ALTER TABLE users ADD COLUMN age INTEGER'],
	})
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(100)
	@IsString({ each: true })
	@MaxLength(20000, { each: true })
	sqlCommands: Array<string>;
}
