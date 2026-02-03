import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export function isValidSQLQuery(query: string): boolean {
	const upperCaseQuery = query.toUpperCase();
	const forbiddenKeywords = ['DROP', 'DELETE', 'ALTER', 'TRUNCATE', 'INSERT', 'UPDATE'];

	if (forbiddenKeywords.some((keyword) => upperCaseQuery.includes(keyword))) {
		return false;
	}

	const cleanedQuery = query.trim().replace(/;$/, '');

	const sqlInjectionPatterns = [/--/, /\/\*/, /\*\//];

	if (sqlInjectionPatterns.some((pattern) => pattern.test(cleanedQuery))) {
		return false;
	}

	if (cleanedQuery.split(';').length > 1) {
		return false;
	}

	const selectPattern = /^\s*SELECT\s+[\s\S]+\s+FROM\s+/i;
	if (!selectPattern.test(cleanedQuery)) {
		return false;
	}

	return true;
}

export function isValidMongoDbCommand(command: string): boolean {
	const upperCaseCommand = command.toUpperCase();
	const forbiddenKeywords = ['DROP', 'REMOVE', 'UPDATE', 'INSERT', 'DELETE'];

	if (forbiddenKeywords.some((keyword) => upperCaseCommand.includes(keyword))) {
		return false;
	}

	const injectionPatterns = [/\/\*/, /\*\//];

	if (injectionPatterns.some((pattern) => pattern.test(command))) {
		return false;
	}

	return true;
}

export function wrapQueryWithLimit(query: string, databaseType: ConnectionTypesEnum, limit: number = 1000): string {
	const queryWithoutSemicolon = query.replace(/;$/, '');

	switch (databaseType) {
		case ConnectionTypesEnum.postgres:
		case ConnectionTypesEnum.agent_postgres:
		case ConnectionTypesEnum.mysql:
		case ConnectionTypesEnum.agent_mysql:
		case ConnectionTypesEnum.mssql:
		case ConnectionTypesEnum.agent_mssql:
			return `SELECT * FROM (${queryWithoutSemicolon}) AS ai_query LIMIT ${limit}`;
		case ConnectionTypesEnum.ibmdb2:
		case ConnectionTypesEnum.agent_ibmdb2:
			return `SELECT * FROM (${queryWithoutSemicolon}) AS ai_query FETCH FIRST ${limit} ROWS ONLY`;
		case ConnectionTypesEnum.oracledb:
		case ConnectionTypesEnum.agent_oracledb:
			return `SELECT * FROM (${queryWithoutSemicolon}) WHERE ROWNUM <= ${limit}`;
		default:
			throw new Error('Unsupported database type');
	}
}

export function sanitizeJsonString(jsonStr: string): string {
	try {
		JSON.parse(jsonStr);
		return jsonStr;
	} catch (_e) {
		const startBrace = jsonStr.indexOf('{');
		if (startBrace === -1) {
			return '{}';
		}

		const endBrace = jsonStr.lastIndexOf('}');
		if (endBrace === -1 || endBrace <= startBrace) {
			return '{}';
		}

		let possibleJson = jsonStr.substring(startBrace, endBrace + 1);

		possibleJson = possibleJson.replace(/,\s*}/g, '}');
		possibleJson = possibleJson.replace(/,\s*]/g, ']');

		try {
			JSON.parse(possibleJson);
			return possibleJson;
		} catch (_parseErr) {
			console.error('Could not sanitize JSON, returning empty object');
			return '{}';
		}
	}
}

export function cleanAIJsonResponse(response: string): string {
	let cleanedResponse = response.trim();
	if (cleanedResponse.startsWith('```json')) {
		cleanedResponse = cleanedResponse.slice(7);
	} else if (cleanedResponse.startsWith('```')) {
		cleanedResponse = cleanedResponse.slice(3);
	}
	if (cleanedResponse.endsWith('```')) {
		cleanedResponse = cleanedResponse.slice(0, -3);
	}
	cleanedResponse = cleanedResponse.trim();

	cleanedResponse = cleanedResponse.replace(/^\s*\/\/.*$/gm, '');
	cleanedResponse = cleanedResponse.replace(/\/\*[\s\S]*?\*\//g, '');
	cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');

	return cleanedResponse.trim();
}
