import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { validateSchemaCache } from '@rocketadmin/shared-code/dist/src/caching/schema-cache-validator.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { GetConnectionDiagramDs } from '../application/data-structures/get-connection-diagram.ds.js';
import { ConnectionDiagramResponseDTO } from '../application/dto/connection-diagram-response.dto.js';
import { buildMermaidErDiagram, MermaidTableInput } from '../utils/build-mermaid-er-diagram.util.js';
import { isSqlConnectionType } from '../utils/is-sql-connection-type.util.js';
import { IGetConnectionDiagram } from './use-cases.interfaces.js';

@Injectable({ scope: Scope.REQUEST })
export class GetConnectionDiagramUseCase
	extends AbstractUseCase<GetConnectionDiagramDs, ConnectionDiagramResponseDTO>
	implements IGetConnectionDiagram
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: GetConnectionDiagramDs): Promise<ConnectionDiagramResponseDTO> {
		const { connectionId, masterPwd, userId } = inputData;
		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		if (!connection) {
			throw new HttpException({ message: Messages.CONNECTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}
		if (!isSqlConnectionType(connection.type)) {
			throw new BadRequestException(Messages.DIAGRAM_NOT_SUPPORTED_FOR_CONNECTION_TYPE);
		}

		const dao = getDataAccessObject(connection);
		const userEmail = isConnectionTypeAgent(connection.type)
			? await this._dbContext.userRepository.getUserEmailOrReturnNull(userId)
			: undefined;

		await validateSchemaCache(dao, userEmail);

		let tables: Array<{ tableName: string; isView: boolean }>;
		try {
			tables = await dao.getTablesFromDB(userEmail);
		} catch (e) {
			throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_TABLES);
		}

		const realTables = tables.filter((t) => !t.isView);
		const tableInputs: Array<MermaidTableInput> = await Promise.all(
			realTables.map((t) => this.collectTableInfo(dao, t.tableName, userEmail)),
		);

		const { diagram, description } = buildMermaidErDiagram(connection.database || null, tableInputs);
		return {
			connectionId,
			databaseType: connection.type as ConnectionTypesEnum,
			diagram,
			description,
			generatedAt: new Date().toISOString(),
		};
	}

	private async collectTableInfo(
		dao: ReturnType<typeof getDataAccessObject>,
		tableName: string,
		userEmail: string | undefined,
	): Promise<MermaidTableInput> {
		const [structure, primaryColumns, foreignKeys] = await Promise.all([
			this.safe<Array<TableStructureDS>>(() => dao.getTableStructure(tableName, userEmail), []),
			this.safe<Array<PrimaryKeyDS>>(() => dao.getTablePrimaryColumns(tableName, userEmail), []),
			this.safe<Array<ForeignKeyDS>>(() => dao.getTableForeignKeys(tableName, userEmail), []),
		]);
		return { tableName, structure, primaryColumns, foreignKeys };
	}

	private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
		try {
			return await fn();
		} catch {
			return fallback;
		}
	}
}
