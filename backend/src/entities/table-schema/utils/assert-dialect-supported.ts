import { BadRequestException } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

const PHASE_1_DIALECTS: ReadonlySet<ConnectionTypesEnum> = new Set([
	ConnectionTypesEnum.postgres,
	ConnectionTypesEnum.mysql,
	ConnectionTypesEnum.mysql2,
]);

export function isDialectSupported(connectionType: ConnectionTypesEnum): boolean {
	return PHASE_1_DIALECTS.has(connectionType);
}

export function assertDialectSupported(connectionType: ConnectionTypesEnum): void {
	if (!isDialectSupported(connectionType)) {
		throw new BadRequestException(
			`Schema changes via AI are not yet supported for "${connectionType}". Supported: PostgreSQL, MySQL.`,
		);
	}
}

const SQL_PARSER_DIALECTS: Record<string, string> = {
	[ConnectionTypesEnum.postgres]: 'PostgresQL',
	[ConnectionTypesEnum.agent_postgres]: 'PostgresQL',
	[ConnectionTypesEnum.mysql]: 'MySQL',
	[ConnectionTypesEnum.mysql2]: 'MySQL',
	[ConnectionTypesEnum.agent_mysql]: 'MySQL',
	[ConnectionTypesEnum.mssql]: 'TransactSQL',
	[ConnectionTypesEnum.agent_mssql]: 'TransactSQL',
};

export function connectionTypeToParserDialect(connectionType: ConnectionTypesEnum): string {
	return SQL_PARSER_DIALECTS[connectionType] ?? 'PostgresQL';
}
