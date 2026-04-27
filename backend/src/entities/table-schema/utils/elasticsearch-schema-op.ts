import { Client } from '@elastic/elasticsearch';
import { BadRequestException } from '@nestjs/common';
import { SchemaChangeTypeEnum } from '../table-schema-change-enums.js';

export interface ElasticsearchExecutionConnection {
	host?: string | null;
	port?: number | null;
	username?: string | null;
	password?: string | null;
	ssl?: boolean | null;
	cert?: string | null;
}

export type ElasticsearchOperationKind = 'createIndex' | 'deleteIndex' | 'updateMapping';

export interface ElasticsearchSchemaOp {
	operation: ElasticsearchOperationKind;
	indexName: string;
	mappings?: Record<string, unknown>;
	settings?: Record<string, unknown>;
	properties?: Record<string, unknown>;
}

const ALLOWED_OPERATIONS: ReadonlySet<ElasticsearchOperationKind> = new Set([
	'createIndex',
	'deleteIndex',
	'updateMapping',
]);

const CHANGE_TYPE_TO_OPERATION: Record<string, ElasticsearchOperationKind> = {
	[SchemaChangeTypeEnum.ELASTICSEARCH_CREATE_INDEX]: 'createIndex',
	[SchemaChangeTypeEnum.ELASTICSEARCH_DELETE_INDEX]: 'deleteIndex',
	[SchemaChangeTypeEnum.ELASTICSEARCH_UPDATE_MAPPING]: 'updateMapping',
};

// Identifiers Elasticsearch reserves for system indices and component templates we must not touch.
const FORBIDDEN_INDEX_PREFIXES = ['.', '_'];

export interface ValidateElasticsearchOpInput {
	opJson: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	allowAnyOperation?: boolean;
}

export function validateProposedElasticsearchOp(input: ValidateElasticsearchOpInput): ElasticsearchSchemaOp {
	const { opJson, changeType, targetTableName, allowAnyOperation } = input;

	if (!opJson || opJson.trim().length === 0) {
		throw new BadRequestException('Proposed Elasticsearch operation is empty.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(opJson);
	} catch (err) {
		throw new BadRequestException(`Proposed Elasticsearch operation is not valid JSON: ${(err as Error).message}`);
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new BadRequestException('Proposed Elasticsearch operation must be a single JSON object.');
	}

	const op = parsed as Record<string, unknown>;
	const operation = op.operation;
	if (typeof operation !== 'string' || !ALLOWED_OPERATIONS.has(operation as ElasticsearchOperationKind)) {
		throw new BadRequestException(
			`Proposed Elasticsearch operation "${String(operation)}" is not one of ${Array.from(ALLOWED_OPERATIONS).join(', ')}.`,
		);
	}

	const indexName = op.indexName;
	if (typeof indexName !== 'string' || indexName.trim().length === 0) {
		throw new BadRequestException('Proposed Elasticsearch operation must include a non-empty "indexName".');
	}
	if (indexName !== targetTableName) {
		throw new BadRequestException(
			`Proposed Elasticsearch operation targets index "${indexName}" which does not match declared targetTableName "${targetTableName}".`,
		);
	}
	for (const prefix of FORBIDDEN_INDEX_PREFIXES) {
		if (indexName.startsWith(prefix)) {
			throw new BadRequestException(
				`Proposed Elasticsearch indexName "${indexName}" starts with reserved prefix "${prefix}"; system indices cannot be modified.`,
			);
		}
	}

	if (!allowAnyOperation) {
		const expected = CHANGE_TYPE_TO_OPERATION[changeType];
		if (expected && expected !== operation) {
			throw new BadRequestException(
				`Proposed Elasticsearch operation "${operation}" does not match declared changeType "${changeType}" (expected "${expected}").`,
			);
		}
	}

	const typed: ElasticsearchSchemaOp = {
		operation: operation as ElasticsearchOperationKind,
		indexName,
	};

	switch (operation) {
		case 'createIndex': {
			if (op.mappings !== undefined) {
				if (!isPlainObject(op.mappings)) {
					throw new BadRequestException('createIndex.mappings must be an object.');
				}
				typed.mappings = op.mappings as Record<string, unknown>;
			}
			if (op.settings !== undefined) {
				if (!isPlainObject(op.settings)) {
					throw new BadRequestException('createIndex.settings must be an object.');
				}
				typed.settings = op.settings as Record<string, unknown>;
			}
			break;
		}
		case 'deleteIndex': {
			break;
		}
		case 'updateMapping': {
			if (!isPlainObject(op.properties) || Object.keys(op.properties as Record<string, unknown>).length === 0) {
				throw new BadRequestException('updateMapping.properties must be a non-empty object of new field definitions.');
			}
			for (const [fieldName, def] of Object.entries(op.properties as Record<string, unknown>)) {
				if (!isPlainObject(def)) {
					throw new BadRequestException(`updateMapping.properties["${fieldName}"] must be an object.`);
				}
			}
			typed.properties = op.properties as Record<string, unknown>;
			break;
		}
	}

	return typed;
}

export async function executeElasticsearchSchemaOp(
	connection: ElasticsearchExecutionConnection,
	op: ElasticsearchSchemaOp,
): Promise<void> {
	const client = buildElasticsearchClient(connection);
	try {
		await dispatchElasticsearchOp(client, op);
	} finally {
		await client.close().catch(() => undefined);
	}
}

function buildElasticsearchClient(connection: ElasticsearchExecutionConnection): Client {
	const host = connection.host ?? '';
	const port = connection.port ?? 9200;
	const protocol = connection.ssl ? 'https' : 'http';
	const node = `${protocol}://${host}:${port}`;
	const options: Record<string, unknown> = {
		node,
		auth: {
			username: connection.username ?? '',
			password: connection.password ?? '',
		},
	};
	if (connection.ssl) {
		const tls: Record<string, unknown> = {
			rejectUnauthorized: !connection.cert,
		};
		if (connection.cert) {
			tls.ca = connection.cert;
		}
		options.tls = tls;
	}
	return new Client(options as ConstructorParameters<typeof Client>[0]);
}

async function dispatchElasticsearchOp(client: Client, op: ElasticsearchSchemaOp): Promise<void> {
	switch (op.operation) {
		case 'createIndex': {
			await client.indices.create({
				index: op.indexName,
				body: {
					...(op.mappings ? { mappings: op.mappings } : {}),
					...(op.settings ? { settings: op.settings } : {}),
				},
			} as Parameters<typeof client.indices.create>[0]);
			return;
		}
		case 'deleteIndex': {
			await client.indices.delete({ index: op.indexName });
			return;
		}
		case 'updateMapping': {
			if (!op.properties) {
				throw new BadRequestException('updateMapping is missing properties.');
			}
			await client.indices.putMapping({
				index: op.indexName,
				body: { properties: op.properties },
			} as Parameters<typeof client.indices.putMapping>[0]);
			return;
		}
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
