import {
	AttributeDefinition,
	BillingMode,
	CreateTableCommand,
	DeleteTableCommand,
	DescribeTableCommand,
	DynamoDB,
	GlobalSecondaryIndex,
	GlobalSecondaryIndexUpdate,
	KeySchemaElement,
	KeyType,
	LocalSecondaryIndex,
	ProjectionType,
	ProvisionedThroughput,
	ResourceNotFoundException,
	ScalarAttributeType,
	SSESpecification,
	SSEType,
	StreamSpecification,
	StreamViewType,
	UpdateTableCommand,
	UpdateTimeToLiveCommand,
} from '@aws-sdk/client-dynamodb';
import { BadRequestException } from '@nestjs/common';
import { SchemaChangeTypeEnum } from '../table-schema-change-enums.js';

export interface DynamoDbExecutionConnection {
	host?: string | null;
	username?: string | null;
	password?: string | null;
}

export type DynamoDbOperationKind = 'createTable' | 'deleteTable' | 'updateTable' | 'updateTimeToLive';

export interface DynamoDbSchemaOp {
	operation: DynamoDbOperationKind;
	tableName: string;
	attributeDefinitions?: AttributeDefinition[];
	keySchema?: KeySchemaElement[];
	billingMode?: BillingMode;
	provisionedThroughput?: ProvisionedThroughput;
	globalSecondaryIndexes?: GlobalSecondaryIndex[];
	localSecondaryIndexes?: LocalSecondaryIndex[];
	globalSecondaryIndexUpdates?: GlobalSecondaryIndexUpdate[];
	streamSpecification?: StreamSpecification;
	sseSpecification?: SSESpecification;
	timeToLiveSpecification?: { enabled: boolean; attributeName: string };
}

const ALLOWED_OPERATIONS: ReadonlySet<DynamoDbOperationKind> = new Set([
	'createTable',
	'deleteTable',
	'updateTable',
	'updateTimeToLive',
]);

const CHANGE_TYPE_TO_OPERATION: Record<string, DynamoDbOperationKind> = {
	[SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE]: 'createTable',
	[SchemaChangeTypeEnum.DYNAMODB_DROP_TABLE]: 'deleteTable',
	[SchemaChangeTypeEnum.DYNAMODB_UPDATE_TABLE]: 'updateTable',
	[SchemaChangeTypeEnum.DYNAMODB_UPDATE_TTL]: 'updateTimeToLive',
};

const ALLOWED_ATTRIBUTE_TYPES: ReadonlySet<ScalarAttributeType> = new Set(['S', 'N', 'B'] as ScalarAttributeType[]);
const ALLOWED_KEY_TYPES: ReadonlySet<KeyType> = new Set(['HASH', 'RANGE'] as KeyType[]);
const ALLOWED_BILLING_MODES: ReadonlySet<BillingMode> = new Set(['PROVISIONED', 'PAY_PER_REQUEST'] as BillingMode[]);
const ALLOWED_PROJECTION_TYPES: ReadonlySet<ProjectionType> = new Set([
	'ALL',
	'KEYS_ONLY',
	'INCLUDE',
] as ProjectionType[]);
const ALLOWED_STREAM_VIEW_TYPES: ReadonlySet<StreamViewType> = new Set([
	'NEW_IMAGE',
	'OLD_IMAGE',
	'NEW_AND_OLD_IMAGES',
	'KEYS_ONLY',
] as StreamViewType[]);
const ALLOWED_SSE_TYPES: ReadonlySet<SSEType> = new Set(['AES256', 'KMS'] as SSEType[]);

export interface ValidateDynamoDbOpInput {
	opJson: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	allowAnyOperation?: boolean;
}

export function validateProposedDynamoDbOp(input: ValidateDynamoDbOpInput): DynamoDbSchemaOp {
	const { opJson, changeType, targetTableName, allowAnyOperation } = input;

	if (!opJson || opJson.trim().length === 0) {
		throw new BadRequestException('Proposed DynamoDB operation is empty.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(opJson);
	} catch (err) {
		throw new BadRequestException(`Proposed DynamoDB operation is not valid JSON: ${(err as Error).message}`);
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new BadRequestException('Proposed DynamoDB operation must be a single JSON object.');
	}

	const op = parsed as Record<string, unknown>;
	const operation = op.operation;
	if (typeof operation !== 'string' || !ALLOWED_OPERATIONS.has(operation as DynamoDbOperationKind)) {
		throw new BadRequestException(
			`Proposed DynamoDB operation "${String(operation)}" is not one of ${Array.from(ALLOWED_OPERATIONS).join(', ')}.`,
		);
	}

	const tableName = op.tableName;
	if (typeof tableName !== 'string' || tableName.trim().length === 0) {
		throw new BadRequestException('Proposed DynamoDB operation must include a non-empty "tableName".');
	}
	if (tableName !== targetTableName) {
		throw new BadRequestException(
			`Proposed DynamoDB operation targets table "${tableName}" which does not match declared targetTableName "${targetTableName}".`,
		);
	}

	if (!allowAnyOperation) {
		const expected = CHANGE_TYPE_TO_OPERATION[changeType];
		if (expected && expected !== operation) {
			throw new BadRequestException(
				`Proposed DynamoDB operation "${operation}" does not match declared changeType "${changeType}" (expected "${expected}").`,
			);
		}
	}

	const typed: DynamoDbSchemaOp = { operation: operation as DynamoDbOperationKind, tableName };

	switch (operation) {
		case 'createTable': {
			typed.attributeDefinitions = parseAttributeDefinitions(op.attributeDefinitions, true);
			typed.keySchema = parseKeySchema(op.keySchema, true);
			ensureAttributesCoverKeys(typed.attributeDefinitions, typed.keySchema);
			typed.billingMode = parseBillingMode(op.billingMode) ?? 'PAY_PER_REQUEST';
			typed.provisionedThroughput = parseProvisionedThroughput(op.provisionedThroughput);
			typed.globalSecondaryIndexes = parseGsiList(op.globalSecondaryIndexes);
			typed.localSecondaryIndexes = parseLsiList(op.localSecondaryIndexes);
			typed.streamSpecification = parseStreamSpecification(op.streamSpecification);
			typed.sseSpecification = parseSseSpecification(op.sseSpecification);
			if (typed.billingMode === 'PROVISIONED' && !typed.provisionedThroughput) {
				throw new BadRequestException(
					'createTable with billingMode=PROVISIONED requires provisionedThroughput { readCapacityUnits, writeCapacityUnits }.',
				);
			}
			break;
		}
		case 'deleteTable': {
			break;
		}
		case 'updateTable': {
			typed.attributeDefinitions = parseAttributeDefinitions(op.attributeDefinitions, false);
			typed.billingMode = parseBillingMode(op.billingMode);
			typed.provisionedThroughput = parseProvisionedThroughput(op.provisionedThroughput);
			typed.globalSecondaryIndexUpdates = parseGsiUpdates(op.globalSecondaryIndexUpdates);
			typed.streamSpecification = parseStreamSpecification(op.streamSpecification);
			const hasAnyField =
				(typed.attributeDefinitions && typed.attributeDefinitions.length > 0) ||
				typed.billingMode !== undefined ||
				typed.provisionedThroughput !== undefined ||
				(typed.globalSecondaryIndexUpdates && typed.globalSecondaryIndexUpdates.length > 0) ||
				typed.streamSpecification !== undefined;
			if (!hasAnyField) {
				throw new BadRequestException(
					'updateTable must change at least one of: attributeDefinitions, billingMode, provisionedThroughput, globalSecondaryIndexUpdates, streamSpecification.',
				);
			}
			break;
		}
		case 'updateTimeToLive': {
			const ttl = op.timeToLiveSpecification;
			if (!ttl || typeof ttl !== 'object' || Array.isArray(ttl)) {
				throw new BadRequestException(
					'updateTimeToLive requires timeToLiveSpecification { enabled: boolean, attributeName: string }.',
				);
			}
			const ttlObj = ttl as Record<string, unknown>;
			if (typeof ttlObj.enabled !== 'boolean') {
				throw new BadRequestException('timeToLiveSpecification.enabled must be a boolean.');
			}
			if (typeof ttlObj.attributeName !== 'string' || ttlObj.attributeName.trim().length === 0) {
				throw new BadRequestException('timeToLiveSpecification.attributeName must be a non-empty string.');
			}
			typed.timeToLiveSpecification = { enabled: ttlObj.enabled, attributeName: ttlObj.attributeName };
			break;
		}
	}

	return typed;
}

export async function executeDynamoDbSchemaOp(
	connection: DynamoDbExecutionConnection,
	op: DynamoDbSchemaOp,
): Promise<void> {
	const client = buildDynamoDbClient(connection);
	try {
		await dispatchDynamoDbOp(client, op);
	} finally {
		client.destroy();
	}
}

function buildDynamoDbClient(connection: DynamoDbExecutionConnection): DynamoDB {
	const endpoint = connection.host ?? '';
	const regionMatch = endpoint.match(/dynamodb\.(.+?)\.amazonaws\.com/);
	const region = regionMatch ? regionMatch[1] : 'us-east-1';
	return new DynamoDB({
		endpoint,
		region: process.env.NODE_ENV === 'test' ? 'localhost' : region,
		credentials: {
			accessKeyId: connection.username ?? '',
			secretAccessKey: connection.password ?? '',
		},
	});
}

async function dispatchDynamoDbOp(client: DynamoDB, op: DynamoDbSchemaOp): Promise<void> {
	switch (op.operation) {
		case 'createTable': {
			await client.send(
				new CreateTableCommand({
					TableName: op.tableName,
					AttributeDefinitions: op.attributeDefinitions,
					KeySchema: op.keySchema,
					BillingMode: op.billingMode,
					ProvisionedThroughput: op.provisionedThroughput,
					GlobalSecondaryIndexes: op.globalSecondaryIndexes,
					LocalSecondaryIndexes: op.localSecondaryIndexes,
					StreamSpecification: op.streamSpecification,
					SSESpecification: op.sseSpecification,
				}),
			);
			await waitForTableActive(client, op.tableName);
			return;
		}
		case 'deleteTable': {
			await waitForTableActive(client, op.tableName);
			await client.send(new DeleteTableCommand({ TableName: op.tableName }));
			return;
		}
		case 'updateTable': {
			await waitForTableActive(client, op.tableName);
			await client.send(
				new UpdateTableCommand({
					TableName: op.tableName,
					AttributeDefinitions: op.attributeDefinitions,
					BillingMode: op.billingMode,
					ProvisionedThroughput: op.provisionedThroughput,
					GlobalSecondaryIndexUpdates: op.globalSecondaryIndexUpdates,
					StreamSpecification: op.streamSpecification,
				}),
			);
			await waitForTableActive(client, op.tableName);
			return;
		}
		case 'updateTimeToLive': {
			if (!op.timeToLiveSpecification) {
				throw new BadRequestException('updateTimeToLive is missing timeToLiveSpecification.');
			}
			await waitForTableActive(client, op.tableName);
			await client.send(
				new UpdateTimeToLiveCommand({
					TableName: op.tableName,
					TimeToLiveSpecification: {
						Enabled: op.timeToLiveSpecification.enabled,
						AttributeName: op.timeToLiveSpecification.attributeName,
					},
				}),
			);
			return;
		}
	}
}

// DynamoDB rejects concurrent UpdateTable / DeleteTable calls while the table or any of its
// GSIs is in a transitional state (CREATING / UPDATING / DELETING). Poll DescribeTable until
// everything is ACTIVE so a forward op immediately followed by its rollback does not race.
async function waitForTableActive(client: DynamoDB, tableName: string, timeoutMs: number = 120_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	let delayMs = 100;
	while (Date.now() < deadline) {
		let table;
		try {
			const resp = await client.send(new DescribeTableCommand({ TableName: tableName }));
			table = resp.Table;
		} catch (err) {
			if (err instanceof ResourceNotFoundException) return;
			throw err;
		}
		const tableActive = table?.TableStatus === 'ACTIVE';
		const gsisActive = (table?.GlobalSecondaryIndexes ?? []).every((g) => g.IndexStatus === 'ACTIVE');
		if (tableActive && gsisActive) return;
		await sleep(delayMs);
		delayMs = Math.min(delayMs * 2, 2_000);
	}
	throw new Error(`Timed out waiting for DynamoDB table "${tableName}" to reach ACTIVE state.`);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAttributeDefinitions(value: unknown, required: boolean): AttributeDefinition[] | undefined {
	if (value === undefined) {
		if (required) throw new BadRequestException('attributeDefinitions is required.');
		return undefined;
	}
	if (!Array.isArray(value)) {
		throw new BadRequestException('attributeDefinitions must be an array.');
	}
	if (required && value.length === 0) {
		throw new BadRequestException('attributeDefinitions must not be empty.');
	}
	return value.map((entry, idx) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			throw new BadRequestException(`attributeDefinitions[${idx}] must be an object.`);
		}
		const obj = entry as Record<string, unknown>;
		const name = obj.attributeName;
		const type = obj.attributeType;
		if (typeof name !== 'string' || name.trim().length === 0) {
			throw new BadRequestException(`attributeDefinitions[${idx}].attributeName must be a non-empty string.`);
		}
		if (typeof type !== 'string' || !ALLOWED_ATTRIBUTE_TYPES.has(type as ScalarAttributeType)) {
			throw new BadRequestException(
				`attributeDefinitions[${idx}].attributeType must be one of ${Array.from(ALLOWED_ATTRIBUTE_TYPES).join(', ')}.`,
			);
		}
		return { AttributeName: name, AttributeType: type as ScalarAttributeType };
	});
}

function parseKeySchema(value: unknown, required: boolean): KeySchemaElement[] | undefined {
	if (value === undefined) {
		if (required) throw new BadRequestException('keySchema is required.');
		return undefined;
	}
	if (!Array.isArray(value) || value.length === 0) {
		throw new BadRequestException('keySchema must be a non-empty array.');
	}
	if (value.length > 2) {
		throw new BadRequestException('keySchema may contain at most 2 elements (HASH and optional RANGE).');
	}
	const seenKeyTypes = new Set<string>();
	return value.map((entry, idx) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			throw new BadRequestException(`keySchema[${idx}] must be an object.`);
		}
		const obj = entry as Record<string, unknown>;
		const name = obj.attributeName;
		const keyType = obj.keyType;
		if (typeof name !== 'string' || name.trim().length === 0) {
			throw new BadRequestException(`keySchema[${idx}].attributeName must be a non-empty string.`);
		}
		if (typeof keyType !== 'string' || !ALLOWED_KEY_TYPES.has(keyType as KeyType)) {
			throw new BadRequestException(`keySchema[${idx}].keyType must be "HASH" or "RANGE".`);
		}
		if (seenKeyTypes.has(keyType)) {
			throw new BadRequestException(`keySchema contains duplicate keyType "${keyType}".`);
		}
		seenKeyTypes.add(keyType);
		return { AttributeName: name, KeyType: keyType as KeyType };
	});
}

function ensureAttributesCoverKeys(
	attributes: AttributeDefinition[] | undefined,
	keys: KeySchemaElement[] | undefined,
): void {
	if (!attributes || !keys) return;
	const known = new Set(attributes.map((a) => a.AttributeName));
	for (const k of keys) {
		if (k.AttributeName && !known.has(k.AttributeName)) {
			throw new BadRequestException(
				`keySchema references attribute "${k.AttributeName}" which is not declared in attributeDefinitions.`,
			);
		}
	}
}

function parseBillingMode(value: unknown): BillingMode | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'string' || !ALLOWED_BILLING_MODES.has(value as BillingMode)) {
		throw new BadRequestException(`billingMode must be one of ${Array.from(ALLOWED_BILLING_MODES).join(', ')}.`);
	}
	return value as BillingMode;
}

function parseProvisionedThroughput(value: unknown): ProvisionedThroughput | undefined {
	if (value === undefined) return undefined;
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new BadRequestException('provisionedThroughput must be an object.');
	}
	const obj = value as Record<string, unknown>;
	const read = obj.readCapacityUnits;
	const write = obj.writeCapacityUnits;
	if (typeof read !== 'number' || !Number.isInteger(read) || read < 1) {
		throw new BadRequestException('provisionedThroughput.readCapacityUnits must be a positive integer.');
	}
	if (typeof write !== 'number' || !Number.isInteger(write) || write < 1) {
		throw new BadRequestException('provisionedThroughput.writeCapacityUnits must be a positive integer.');
	}
	return { ReadCapacityUnits: read, WriteCapacityUnits: write };
}

function parseGsiList(value: unknown): GlobalSecondaryIndex[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) {
		throw new BadRequestException('globalSecondaryIndexes must be an array.');
	}
	return value.map((entry, idx) => parseGsi(entry, idx));
}

function parseLsiList(value: unknown): LocalSecondaryIndex[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) {
		throw new BadRequestException('localSecondaryIndexes must be an array.');
	}
	return value.map((entry, idx) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			throw new BadRequestException(`localSecondaryIndexes[${idx}] must be an object.`);
		}
		const obj = entry as Record<string, unknown>;
		const name = obj.indexName;
		if (typeof name !== 'string' || name.trim().length === 0) {
			throw new BadRequestException(`localSecondaryIndexes[${idx}].indexName must be a non-empty string.`);
		}
		const keySchema = parseKeySchema(obj.keySchema, true)!;
		const projection = parseProjection(obj.projection, idx, 'localSecondaryIndexes');
		return { IndexName: name, KeySchema: keySchema, Projection: projection };
	});
}

function parseGsi(entry: unknown, idx: number): GlobalSecondaryIndex {
	if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
		throw new BadRequestException(`globalSecondaryIndexes[${idx}] must be an object.`);
	}
	const obj = entry as Record<string, unknown>;
	const name = obj.indexName;
	if (typeof name !== 'string' || name.trim().length === 0) {
		throw new BadRequestException(`globalSecondaryIndexes[${idx}].indexName must be a non-empty string.`);
	}
	const keySchema = parseKeySchema(obj.keySchema, true)!;
	const projection = parseProjection(obj.projection, idx, 'globalSecondaryIndexes');
	const throughput = parseProvisionedThroughput(obj.provisionedThroughput);
	return {
		IndexName: name,
		KeySchema: keySchema,
		Projection: projection,
		ProvisionedThroughput: throughput,
	};
}

function parseGsiUpdates(value: unknown): GlobalSecondaryIndexUpdate[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) {
		throw new BadRequestException('globalSecondaryIndexUpdates must be an array.');
	}
	return value.map((entry, idx) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			throw new BadRequestException(`globalSecondaryIndexUpdates[${idx}] must be an object.`);
		}
		const obj = entry as Record<string, unknown>;
		const out: GlobalSecondaryIndexUpdate = {};
		if (obj.create !== undefined) {
			out.Create = parseGsiCreateAction(obj.create, idx);
		}
		if (obj.update !== undefined) {
			out.Update = parseGsiUpdateAction(obj.update, idx);
		}
		if (obj.delete !== undefined) {
			out.Delete = parseGsiDeleteAction(obj.delete, idx);
		}
		const filled = [out.Create, out.Update, out.Delete].filter((v) => v !== undefined);
		if (filled.length !== 1) {
			throw new BadRequestException(
				`globalSecondaryIndexUpdates[${idx}] must contain exactly one of create, update, or delete.`,
			);
		}
		return out;
	});
}

function parseGsiCreateAction(value: unknown, idx: number): GlobalSecondaryIndexUpdate['Create'] {
	const gsi = parseGsi(value, idx);
	return {
		IndexName: gsi.IndexName!,
		KeySchema: gsi.KeySchema!,
		Projection: gsi.Projection!,
		ProvisionedThroughput: gsi.ProvisionedThroughput,
	};
}

function parseGsiUpdateAction(value: unknown, idx: number): GlobalSecondaryIndexUpdate['Update'] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new BadRequestException(`globalSecondaryIndexUpdates[${idx}].update must be an object.`);
	}
	const obj = value as Record<string, unknown>;
	const name = obj.indexName;
	if (typeof name !== 'string' || name.trim().length === 0) {
		throw new BadRequestException(`globalSecondaryIndexUpdates[${idx}].update.indexName must be a non-empty string.`);
	}
	const throughput = parseProvisionedThroughput(obj.provisionedThroughput);
	if (!throughput) {
		throw new BadRequestException(`globalSecondaryIndexUpdates[${idx}].update.provisionedThroughput is required.`);
	}
	return { IndexName: name, ProvisionedThroughput: throughput };
}

function parseGsiDeleteAction(value: unknown, idx: number): GlobalSecondaryIndexUpdate['Delete'] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new BadRequestException(`globalSecondaryIndexUpdates[${idx}].delete must be an object.`);
	}
	const obj = value as Record<string, unknown>;
	const name = obj.indexName;
	if (typeof name !== 'string' || name.trim().length === 0) {
		throw new BadRequestException(`globalSecondaryIndexUpdates[${idx}].delete.indexName must be a non-empty string.`);
	}
	return { IndexName: name };
}

function parseProjection(
	value: unknown,
	idx: number,
	parent: 'globalSecondaryIndexes' | 'localSecondaryIndexes',
): { ProjectionType: ProjectionType; NonKeyAttributes?: string[] } {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new BadRequestException(`${parent}[${idx}].projection must be an object.`);
	}
	const obj = value as Record<string, unknown>;
	const pt = obj.projectionType;
	if (typeof pt !== 'string' || !ALLOWED_PROJECTION_TYPES.has(pt as ProjectionType)) {
		throw new BadRequestException(
			`${parent}[${idx}].projection.projectionType must be one of ${Array.from(ALLOWED_PROJECTION_TYPES).join(', ')}.`,
		);
	}
	const result: { ProjectionType: ProjectionType; NonKeyAttributes?: string[] } = {
		ProjectionType: pt as ProjectionType,
	};
	if (pt === 'INCLUDE') {
		const nonKey = obj.nonKeyAttributes;
		if (!Array.isArray(nonKey) || nonKey.length === 0 || !nonKey.every((a) => typeof a === 'string' && a.length > 0)) {
			throw new BadRequestException(
				`${parent}[${idx}].projection.nonKeyAttributes must be a non-empty array of strings when projectionType=INCLUDE.`,
			);
		}
		result.NonKeyAttributes = nonKey as string[];
	}
	return result;
}

function parseStreamSpecification(value: unknown): StreamSpecification | undefined {
	if (value === undefined) return undefined;
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new BadRequestException('streamSpecification must be an object.');
	}
	const obj = value as Record<string, unknown>;
	if (typeof obj.streamEnabled !== 'boolean') {
		throw new BadRequestException('streamSpecification.streamEnabled must be a boolean.');
	}
	const spec: StreamSpecification = { StreamEnabled: obj.streamEnabled };
	if (obj.streamViewType !== undefined) {
		if (
			typeof obj.streamViewType !== 'string' ||
			!ALLOWED_STREAM_VIEW_TYPES.has(obj.streamViewType as StreamViewType)
		) {
			throw new BadRequestException(
				`streamSpecification.streamViewType must be one of ${Array.from(ALLOWED_STREAM_VIEW_TYPES).join(', ')}.`,
			);
		}
		spec.StreamViewType = obj.streamViewType as StreamViewType;
	}
	return spec;
}

function parseSseSpecification(value: unknown): SSESpecification | undefined {
	if (value === undefined) return undefined;
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new BadRequestException('sseSpecification must be an object.');
	}
	const obj = value as Record<string, unknown>;
	const spec: SSESpecification = {};
	if (obj.enabled !== undefined) {
		if (typeof obj.enabled !== 'boolean') {
			throw new BadRequestException('sseSpecification.enabled must be a boolean.');
		}
		spec.Enabled = obj.enabled;
	}
	if (obj.sseType !== undefined) {
		if (typeof obj.sseType !== 'string' || !ALLOWED_SSE_TYPES.has(obj.sseType as SSEType)) {
			throw new BadRequestException(
				`sseSpecification.sseType must be one of ${Array.from(ALLOWED_SSE_TYPES).join(', ')}.`,
			);
		}
		spec.SSEType = obj.sseType as SSEType;
	}
	if (obj.kmsMasterKeyId !== undefined) {
		if (typeof obj.kmsMasterKeyId !== 'string') {
			throw new BadRequestException('sseSpecification.kmsMasterKeyId must be a string.');
		}
		spec.KMSMasterKeyId = obj.kmsMasterKeyId;
	}
	return spec;
}
