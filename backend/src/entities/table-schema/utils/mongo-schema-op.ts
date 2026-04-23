import { BadRequestException } from '@nestjs/common';
import { Db, Document, IndexDirection, MongoClient, MongoClientOptions } from 'mongodb';
import { SchemaChangeTypeEnum } from '../table-schema-change-enums.js';

export interface MongoExecutionConnection {
	host?: string | null;
	port?: number | null;
	username?: string | null;
	password?: string | null;
	database?: string | null;
	ssl?: boolean | null;
	cert?: string | null;
	authSource?: string | null;
}

export type MongoOperationKind = 'createCollection' | 'dropCollection' | 'setValidator' | 'createIndex' | 'dropIndex';

export interface MongoSchemaOp {
	operation: MongoOperationKind;
	collectionName: string;
	validatorSchema?: Document | null;
	validationLevel?: 'off' | 'strict' | 'moderate';
	validationAction?: 'warn' | 'error';
	indexName?: string;
	indexSpec?: Record<string, IndexDirection>;
	indexOptions?: Document;
}

const ALLOWED_OPERATIONS: ReadonlySet<MongoOperationKind> = new Set([
	'createCollection',
	'dropCollection',
	'setValidator',
	'createIndex',
	'dropIndex',
]);

const CHANGE_TYPE_TO_OPERATION: Record<string, MongoOperationKind> = {
	[SchemaChangeTypeEnum.MONGO_CREATE_COLLECTION]: 'createCollection',
	[SchemaChangeTypeEnum.MONGO_DROP_COLLECTION]: 'dropCollection',
	[SchemaChangeTypeEnum.MONGO_SET_VALIDATOR]: 'setValidator',
	[SchemaChangeTypeEnum.MONGO_CREATE_INDEX]: 'createIndex',
	[SchemaChangeTypeEnum.MONGO_DROP_INDEX]: 'dropIndex',
};

// JavaScript-executing operators that would let the AI smuggle arbitrary code into the server.
const FORBIDDEN_VALIDATOR_OPERATORS = ['$where', '$function', '$accumulator'];

export interface ValidateMongoOpInput {
	opJson: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	// When true (rollback path), we do not enforce changeType↔operation matching — rollback
	// for a createCollection is a dropCollection, etc. We still enforce structural safety.
	allowAnyOperation?: boolean;
}

export function validateProposedMongoOp(input: ValidateMongoOpInput): MongoSchemaOp {
	const { opJson, changeType, targetTableName, allowAnyOperation } = input;

	if (!opJson || opJson.trim().length === 0) {
		throw new BadRequestException('Proposed Mongo operation is empty.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(opJson);
	} catch (err) {
		throw new BadRequestException(`Proposed Mongo operation is not valid JSON: ${(err as Error).message}`);
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new BadRequestException('Proposed Mongo operation must be a single JSON object.');
	}

	const op = parsed as Record<string, unknown>;
	const operation = op.operation;
	if (typeof operation !== 'string' || !ALLOWED_OPERATIONS.has(operation as MongoOperationKind)) {
		throw new BadRequestException(
			`Proposed Mongo operation "${String(operation)}" is not one of ${Array.from(ALLOWED_OPERATIONS).join(', ')}.`,
		);
	}

	const collectionName = op.collectionName;
	if (typeof collectionName !== 'string' || collectionName.trim().length === 0) {
		throw new BadRequestException('Proposed Mongo operation must include a non-empty "collectionName".');
	}
	if (collectionName !== targetTableName) {
		throw new BadRequestException(
			`Proposed Mongo operation targets collection "${collectionName}" which does not match declared targetTableName "${targetTableName}".`,
		);
	}

	if (!allowAnyOperation) {
		const expected = CHANGE_TYPE_TO_OPERATION[changeType];
		if (expected && expected !== operation) {
			throw new BadRequestException(
				`Proposed Mongo operation "${operation}" does not match declared changeType "${changeType}" (expected "${expected}").`,
			);
		}
	}

	const typedOp: MongoSchemaOp = { operation: operation as MongoOperationKind, collectionName };

	switch (operation) {
		case 'setValidator': {
			const schemaValue = op.validatorSchema;
			if (schemaValue !== null && schemaValue !== undefined && typeof schemaValue !== 'object') {
				throw new BadRequestException('setValidator.validatorSchema must be an object or null.');
			}
			assertNoForbiddenValidatorOperators(schemaValue);
			typedOp.validatorSchema = (schemaValue ?? null) as Document | null;
			if (op.validationLevel !== undefined) {
				if (op.validationLevel !== 'off' && op.validationLevel !== 'strict' && op.validationLevel !== 'moderate') {
					throw new BadRequestException('setValidator.validationLevel must be "off", "strict", or "moderate".');
				}
				typedOp.validationLevel = op.validationLevel;
			}
			if (op.validationAction !== undefined) {
				if (op.validationAction !== 'warn' && op.validationAction !== 'error') {
					throw new BadRequestException('setValidator.validationAction must be "warn" or "error".');
				}
				typedOp.validationAction = op.validationAction;
			}
			break;
		}
		case 'createIndex': {
			const spec = op.indexSpec;
			if (!spec || typeof spec !== 'object' || Array.isArray(spec) || Object.keys(spec).length === 0) {
				throw new BadRequestException('createIndex.indexSpec must be a non-empty object.');
			}
			typedOp.indexSpec = spec as Record<string, IndexDirection>;
			const topLevelName = typeof op.indexName === 'string' ? op.indexName : undefined;
			const optionsValue = op.indexOptions;
			if (
				optionsValue !== undefined &&
				(typeof optionsValue !== 'object' || optionsValue === null || Array.isArray(optionsValue))
			) {
				throw new BadRequestException('createIndex.indexOptions must be an object when provided.');
			}
			const options = (optionsValue as Document | undefined) ?? {};
			const optionsName = typeof options.name === 'string' ? (options.name as string) : undefined;
			const resolvedName = topLevelName ?? optionsName;
			if (!resolvedName || resolvedName.trim().length === 0) {
				throw new BadRequestException(
					'createIndex requires an explicit indexName (so rollback dropIndex is unambiguous).',
				);
			}
			options.name = resolvedName;
			typedOp.indexName = resolvedName;
			typedOp.indexOptions = options;
			break;
		}
		case 'dropIndex': {
			const name = op.indexName;
			if (typeof name !== 'string' || name.trim().length === 0) {
				throw new BadRequestException('dropIndex requires a non-empty "indexName".');
			}
			typedOp.indexName = name;
			break;
		}
		case 'createCollection':
		case 'dropCollection':
			break;
	}

	return typedOp;
}

export async function executeMongoSchemaOp(connection: MongoExecutionConnection, op: MongoSchemaOp): Promise<void> {
	const { client, db } = await openMongoConnection(connection);
	try {
		await dispatchMongoOp(db, op);
	} finally {
		await client.close().catch(() => undefined);
	}
}

function assertNoForbiddenValidatorOperators(value: unknown): void {
	if (!value || typeof value !== 'object') return;
	const stack: unknown[] = [value];
	while (stack.length > 0) {
		const current = stack.pop();
		if (!current || typeof current !== 'object') continue;
		if (Array.isArray(current)) {
			for (const item of current) stack.push(item);
			continue;
		}
		for (const [k, v] of Object.entries(current as Record<string, unknown>)) {
			if (FORBIDDEN_VALIDATOR_OPERATORS.includes(k)) {
				throw new BadRequestException(
					`Validator schema contains forbidden operator "${k}" (JavaScript execution in validators is blocked).`,
				);
			}
			if (v && typeof v === 'object') stack.push(v);
		}
	}
}

async function openMongoConnection(connection: MongoExecutionConnection): Promise<{ client: MongoClient; db: Db }> {
	const host = connection.host ?? '';
	const username = connection.username ?? '';
	const password = connection.password ?? '';
	const database = connection.database ?? '';
	const port = connection.port ?? 27017;

	let mongoConnectionString = '';
	if (host.includes('mongodb+srv')) {
		const hostNameParts = host.split('//');
		mongoConnectionString = `${hostNameParts[0]}//${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostNameParts[1]}/${database}`;
	} else {
		mongoConnectionString = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
	}

	let options: MongoClientOptions = {};
	if (connection.ssl) {
		options = {
			ssl: true,
			ca: connection.cert ? [connection.cert] : undefined,
		} as MongoClientOptions;
	}

	if (connection.authSource) {
		mongoConnectionString += mongoConnectionString.includes('?') ? '&' : '?';
		mongoConnectionString += `authSource=${connection.authSource}`;
	}

	const client = new MongoClient(mongoConnectionString, options);
	const connectedClient = await client.connect();
	return { client, db: connectedClient.db(database) };
}

async function dispatchMongoOp(db: Db, op: MongoSchemaOp): Promise<void> {
	switch (op.operation) {
		case 'createCollection': {
			await db.createCollection(op.collectionName);
			return;
		}
		case 'dropCollection': {
			await db.collection(op.collectionName).drop();
			return;
		}
		case 'setValidator': {
			const command: Document = { collMod: op.collectionName };
			command.validator = op.validatorSchema ?? {};
			command.validationLevel = op.validationLevel ?? 'strict';
			command.validationAction = op.validationAction ?? 'error';
			await db.command(command);
			return;
		}
		case 'createIndex': {
			if (!op.indexSpec) throw new BadRequestException('createIndex is missing indexSpec.');
			await db.collection(op.collectionName).createIndex(op.indexSpec, op.indexOptions ?? {});
			return;
		}
		case 'dropIndex': {
			if (!op.indexName) throw new BadRequestException('dropIndex is missing indexName.');
			await db.collection(op.collectionName).dropIndex(op.indexName);
			return;
		}
	}
}
