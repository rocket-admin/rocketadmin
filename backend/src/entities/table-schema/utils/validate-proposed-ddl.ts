import { BadRequestException } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import sqlParser from 'node-sql-parser';

const { Parser } = sqlParser;

import { isMongoSchemaChangeType, SchemaChangeTypeEnum } from '../table-schema-change-enums.js';
import { connectionTypeToParserDialect } from './assert-dialect-supported.js';

const FORBIDDEN_PATTERNS: ReadonlyArray<RegExp> = [
	/\bDROP\s+DATABASE\b/i,
	/\bDROP\s+SCHEMA\b/i,
	/\bDROP\s+USER\b/i,
	/\bDROP\s+ROLE\b/i,
	/\bCREATE\s+DATABASE\b/i,
	/\bCREATE\s+SCHEMA\b/i,
	/\bCREATE\s+USER\b/i,
	/\bCREATE\s+ROLE\b/i,
	/\bALTER\s+DATABASE\b/i,
	/\bALTER\s+SCHEMA\b/i,
	/\bALTER\s+USER\b/i,
	/\bALTER\s+ROLE\b/i,
	/\bGRANT\b/i,
	/\bREVOKE\b/i,
	/\bTRUNCATE\b/i,
	/\bDELETE\s+FROM\b/i,
	/\bINSERT\s+INTO\b/i,
	/\bUPDATE\s+[^\s]+\s+SET\b/i,
	/\bCOPY\b/i,
	/\\\w/,
];

interface ExpectedShape {
	type: string;
	keyword?: string;
}

const EXPECTED_SHAPES: Record<SchemaChangeTypeEnum, ExpectedShape | null> = {
	[SchemaChangeTypeEnum.CREATE_TABLE]: { type: 'create', keyword: 'table' },
	[SchemaChangeTypeEnum.DROP_TABLE]: { type: 'drop', keyword: 'table' },
	[SchemaChangeTypeEnum.ADD_COLUMN]: { type: 'alter', keyword: 'table' },
	[SchemaChangeTypeEnum.DROP_COLUMN]: { type: 'alter', keyword: 'table' },
	[SchemaChangeTypeEnum.ALTER_COLUMN]: { type: 'alter', keyword: 'table' },
	[SchemaChangeTypeEnum.ADD_INDEX]: { type: 'create', keyword: 'index' },
	[SchemaChangeTypeEnum.DROP_INDEX]: { type: 'drop', keyword: 'index' },
	[SchemaChangeTypeEnum.ADD_FOREIGN_KEY]: { type: 'alter', keyword: 'table' },
	[SchemaChangeTypeEnum.DROP_FOREIGN_KEY]: { type: 'alter', keyword: 'table' },
	[SchemaChangeTypeEnum.ADD_PRIMARY_KEY]: { type: 'alter', keyword: 'table' },
	[SchemaChangeTypeEnum.DROP_PRIMARY_KEY]: { type: 'alter', keyword: 'table' },
	[SchemaChangeTypeEnum.MONGO_CREATE_COLLECTION]: null,
	[SchemaChangeTypeEnum.MONGO_DROP_COLLECTION]: null,
	[SchemaChangeTypeEnum.MONGO_SET_VALIDATOR]: null,
	[SchemaChangeTypeEnum.MONGO_CREATE_INDEX]: null,
	[SchemaChangeTypeEnum.MONGO_DROP_INDEX]: null,
	[SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE]: null,
	[SchemaChangeTypeEnum.DYNAMODB_DROP_TABLE]: null,
	[SchemaChangeTypeEnum.DYNAMODB_UPDATE_TABLE]: null,
	[SchemaChangeTypeEnum.DYNAMODB_UPDATE_TTL]: null,
	[SchemaChangeTypeEnum.ELASTICSEARCH_CREATE_INDEX]: null,
	[SchemaChangeTypeEnum.ELASTICSEARCH_DELETE_INDEX]: null,
	[SchemaChangeTypeEnum.ELASTICSEARCH_UPDATE_MAPPING]: null,
	[SchemaChangeTypeEnum.ROLLBACK]: null,
	[SchemaChangeTypeEnum.OTHER]: null,
};

export interface ValidateProposedDdlOptions {
	sql: string;
	connectionType: ConnectionTypesEnum;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
}

export function validateProposedDdl(opts: ValidateProposedDdlOptions): void {
	const { sql, connectionType, changeType, targetTableName } = opts;
	const trimmed = sql?.trim() ?? '';
	if (!trimmed) {
		throw new BadRequestException('Proposed SQL is empty.');
	}

	for (const pattern of FORBIDDEN_PATTERNS) {
		if (pattern.test(trimmed)) {
			throw new BadRequestException(`Proposed SQL contains a forbidden construct (matched ${pattern}).`);
		}
	}

	const stripped = trimmed.replace(/;+\s*$/, '');
	if (/;/.test(stripped)) {
		throw new BadRequestException('Proposed SQL must be a single statement; multi-statement scripts are rejected.');
	}

	// MongoDB schema changes are emitted as structured JSON, not SQL. Parsing them with
	// node-sql-parser is meaningless (and will always fall through to the warn path),
	// and the AST/target-table checks below don't apply. Richer shape validation runs
	// in validateProposedMongoOp, which the use-cases call for Mongo dispatch.
	if (isMongoSchemaChangeType(changeType)) {
		return;
	}

	const parser = new Parser();
	let ast: unknown;
	try {
		ast = parser.astify(trimmed, { database: connectionTypeToParserDialect(connectionType) });
	} catch (err) {
		// AST shape verification is defense-in-depth, not the only gate:
		// the forbidden-construct regex and single-statement check above have already run,
		// and the DB itself rejects invalid DDL with auto-rollback. node-sql-parser's grammar
		// doesn't cover every dialect feature (GENERATED AS IDENTITY, EXCLUDE, PARTITION BY,
		// INHERITS, TABLESPACE, vendor-specific types), so we log and fall through rather than
		// block legitimate statements.
		// eslint-disable-next-line no-console
		console.warn(
			`[validate-proposed-ddl] parser could not analyze SQL (${(err as Error).message}); falling back to regex checks. sql=${trimmed.slice(0, 200)}`,
		);
		return;
	}

	const statements = Array.isArray(ast) ? ast : [ast];
	if (statements.length !== 1) {
		throw new BadRequestException('Proposed SQL must contain exactly one statement.');
	}

	const expected = EXPECTED_SHAPES[changeType];
	if (expected) {
		const stmt = statements[0] as { type?: string; keyword?: string };
		if (stmt?.type !== expected.type) {
			throw new BadRequestException(
				`Proposed SQL does not match declared changeType ${changeType}: expected AST type "${expected.type}", got "${stmt?.type ?? 'unknown'}".`,
			);
		}
		if (expected.keyword && stmt.keyword && stmt.keyword !== expected.keyword) {
			throw new BadRequestException(
				`Proposed SQL does not match declared changeType ${changeType}: expected keyword "${expected.keyword}", got "${stmt.keyword}".`,
			);
		}
	}

	const extractedName = extractTableName(statements[0]);
	if (extractedName && normalizeIdentifier(extractedName) !== normalizeIdentifier(targetTableName)) {
		throw new BadRequestException(
			`Proposed SQL targets table "${extractedName}" which does not match declared targetTableName "${targetTableName}".`,
		);
	}
}

function extractTableName(ast: unknown): string | null {
	if (!ast || typeof ast !== 'object') return null;
	const node = ast as Record<string, unknown>;

	const tableArr = node.table ?? node.name;
	if (Array.isArray(tableArr) && tableArr.length > 0) {
		const first = tableArr[0] as Record<string, unknown>;
		if (first && typeof first === 'object') {
			const name = first.table ?? first.name;
			if (typeof name === 'string') return name;
		}
	}
	return null;
}

function normalizeIdentifier(name: string): string {
	return name.replace(/^[`"[]|[`"\]]$/g, '').toLowerCase();
}
