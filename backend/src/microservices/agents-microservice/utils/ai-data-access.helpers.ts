import { BadRequestException, ForbiddenException, HttpStatus, Logger } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/shared/interfaces/data-access-object-agent.interface.js';
import { collectMongoPipelineCollections } from '../../../ai-core/tools/collect-mongo-pipeline-collections.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { CedarPermissionsService } from '../../../entities/cedar-authorization/cedar-permissions.service.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { ConnectionNotFoundException } from '../../../exceptions/custom-exceptions/connection-not-found-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';

const logger = new Logger('AgentsAiDataAccess');

export type AiConnectionSetup = {
	foundConnection: ConnectionEntity;
	dataAccessObject: IDataAccessObject | IDataAccessObjectAgent;
	isMongoDb: boolean;
	userEmail: string;
};

export async function setupAiConnection(
	dbContext: IGlobalDatabaseContext,
	connectionId: string,
	masterPassword: string | null,
	userId: string,
): Promise<AiConnectionSetup> {
	const foundConnection = await dbContext.connectionRepository.findAndDecryptConnection(
		connectionId,
		masterPassword as string,
	);

	if (!foundConnection) {
		throw new ConnectionNotFoundException(HttpStatus.NOT_FOUND);
	}

	let userEmail = '';
	if (isConnectionTypeAgent(foundConnection.type)) {
		userEmail = (await dbContext.userRepository.getUserEmailOrReturnNull(userId)) ?? '';
	}

	const connectionProperties = await dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);

	if (connectionProperties && !connectionProperties.allow_ai_requests) {
		throw new BadRequestException(Messages.AI_REQUESTS_NOT_ALLOWED);
	}

	const dataAccessObject = getDataAccessObject(foundConnection);
	const databaseType = foundConnection.type;
	const isMongoDb = databaseType === ConnectionTypesEnum.mongodb || databaseType === ConnectionTypesEnum.agent_mongodb;

	return { foundConnection, dataAccessObject, isMongoDb, userEmail };
}

export async function assertUserCanReadTables(
	cedarPermissions: CedarPermissionsService,
	tableNames: Array<string>,
	userId: string,
	connectionId: string,
): Promise<void> {
	const uniqueTableNames = Array.from(
		new Set(tableNames.map((name) => name?.trim()).filter((name): name is string => Boolean(name))),
	);

	if (uniqueTableNames.length === 0) return;

	const readableTables = await cedarPermissions.getReadableTables(userId, connectionId, uniqueTableNames);
	const blockedTable = uniqueTableNames.find((tableName) => !readableTables.has(tableName));
	if (blockedTable !== undefined) {
		logger.warn(
			`AI request blocked for user ${userId} on connection ${connectionId}: ` +
				`no read permission for table "${blockedTable}"`,
		);
		throw new ForbiddenException(Messages.NO_READ_PERMISSION_FOR_TABLE(blockedTable));
	}
}

export async function assertUserCanReadPipelineCollections(
	cedarPermissions: CedarPermissionsService,
	pipeline: string,
	baseCollection: string,
	userId: string,
	connectionId: string,
	dataAccessObject: IDataAccessObject | IDataAccessObjectAgent,
): Promise<void> {
	const collected = collectMongoPipelineCollections(pipeline);

	let collectionsToCheck: Array<string>;
	if (collected.kind === 'tables') {
		collectionsToCheck = [baseCollection, ...collected.tables];
	} else {
		logger.warn(
			`AI pipeline permission check could not resolve referenced collections for connection ${connectionId} ` +
				`(reason: ${collected.reason}); falling back to all-collections read check.`,
		);
		collectionsToCheck = (await dataAccessObject.getTablesFromDB()).map((table) => table.tableName);
	}

	await assertUserCanReadTables(cedarPermissions, collectionsToCheck, userId, connectionId);
}

export async function getTableStructureInfo(
	cedarPermissions: CedarPermissionsService,
	dao: IDataAccessObject | IDataAccessObjectAgent,
	tableName: string,
	userEmail: string,
	foundConnection: ConnectionEntity,
	userId: string,
): Promise<Record<string, unknown>> {
	const [tableStructure, tableForeignKeys, referencedTableNamesAndColumns] = await Promise.all([
		dao.getTableStructure(tableName, userEmail),
		dao.getTableForeignKeys(tableName, userEmail),
		dao.getReferencedTableNamesAndColumns(tableName, userEmail),
	]);

	// Only expose the structure of related tables the user is permitted to read — otherwise
	// foreign-key traversal would leak the schema of tables the user has no access to. One batched
	// permission check covers both directions of the relation.
	const referencedByTableNames = referencedTableNamesAndColumns.flatMap((referencedTable) =>
		referencedTable.referenced_by.map((table) => table.table_name),
	);
	const foreignTableNames = tableForeignKeys.map((foreignKey) => foreignKey.referenced_table_name);
	const readableTables = await cedarPermissions.getReadableTables(userId, foundConnection.id, [
		...referencedByTableNames,
		...foreignTableNames,
	]);

	const referencedTablesStructures = await Promise.all(
		referencedByTableNames
			.filter((name) => readableTables.has(name))
			.map(async (name) => ({ tableName: name, structure: await dao.getTableStructure(name, userEmail) })),
	);
	const foreignTablesStructures = await Promise.all(
		foreignTableNames
			.filter((name) => readableTables.has(name))
			.map(async (name) => ({ tableName: name, structure: await dao.getTableStructure(name, userEmail) })),
	);

	return {
		tableStructure,
		tableName,
		schema: foundConnection.schema || null,
		tableForeignKeys,
		referencedTableNamesAndColumns,
		referencedTablesStructures,
		foreignTablesStructures,
	};
}
