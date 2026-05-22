import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export class ConnectionDiagramPreviewStatementResultDTO {
	@ApiProperty()
	sql: string;

	@ApiProperty({ enum: ['applied', 'skipped', 'error'] })
	status: 'applied' | 'skipped' | 'error';

	@ApiProperty({ required: false, nullable: true })
	message?: string;
}

export class ConnectionDiagramPreviewDiffDTO {
	@ApiProperty({ type: [String] })
	addedTables: Array<string>;

	@ApiProperty({ type: [String] })
	droppedTables: Array<string>;

	@ApiProperty({
		description: 'Map of table name -> array of column names that would be added',
		type: 'object',
		additionalProperties: { type: 'array', items: { type: 'string' } },
	})
	addedColumns: Record<string, Array<string>>;

	@ApiProperty({
		description: 'Map of table name -> array of column names that would be removed',
		type: 'object',
		additionalProperties: { type: 'array', items: { type: 'string' } },
	})
	droppedColumns: Record<string, Array<string>>;

	@ApiProperty({
		description: 'Map of table name -> array of "column->refTable.refColumn" descriptors for new foreign keys',
		type: 'object',
		additionalProperties: { type: 'array', items: { type: 'string' } },
	})
	addedForeignKeys: Record<string, Array<string>>;

	@ApiProperty({ type: [ConnectionDiagramPreviewStatementResultDTO] })
	statementResults: Array<ConnectionDiagramPreviewStatementResultDTO>;
}

export class ConnectionDiagramPreviewResponseDTO {
	@ApiProperty()
	connectionId: string;

	@ApiProperty({ enum: ConnectionTypesEnum })
	databaseType: ConnectionTypesEnum;

	@ApiProperty({
		description:
			'Mermaid erDiagram source string representing the schema AFTER applying the provided SQL statements. Added entities are styled green via a classDef directive; new columns are marked with a "NEW" attribute key; new foreign keys are marked with "[NEW]" in the relationship label.',
	})
	diagram: string;

	@ApiProperty({ description: 'Human-readable description of the projected database structure (post-changes).' })
	description: string;

	@ApiProperty({ type: ConnectionDiagramPreviewDiffDTO })
	diff: ConnectionDiagramPreviewDiffDTO;

	@ApiProperty()
	generatedAt: string;
}
