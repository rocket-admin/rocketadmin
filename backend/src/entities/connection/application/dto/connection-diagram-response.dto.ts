import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export class ConnectionDiagramResponseDTO {
	@ApiProperty()
	connectionId: string;

	@ApiProperty({ enum: ConnectionTypesEnum })
	databaseType: ConnectionTypesEnum;

	@ApiProperty({ description: 'Mermaid erDiagram source string' })
	diagram: string;

	@ApiProperty({ description: 'Human-readable description of the database structure' })
	description: string;

	@ApiProperty()
	generatedAt: string;
}
