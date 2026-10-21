import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as filterTypes from './filter-types';
import * as recordEditTypes from './record-edit-types';
import * as recordViewTypes from './record-view-types';
import * as tableDisplayTypes from './table-display-types';

/**
 * Parity guard for the widget type maps: every DB-type → widget table must keep exactly the keys
 * (and the same widget per key) as the Angular map it was ported from, because the row edit form,
 * the record view, the table cells and the filters all pick their widget from these tables.
 *
 * The Angular source is parsed textually rather than imported (it pulls in Angular components).
 * Until the Angular app is deleted (Phase 4) this pins the two together.
 */
const ANGULAR_CONSTS = resolve(process.cwd(), '../frontend/src/app/consts');

type WidgetMap = Record<string, unknown>;

/** `{ section: { key: 'ComponentName' } }` from an Angular `export const <name> = { … }` block. */
function angularMap(file: string, exportName: string): Record<string, Record<string, string>> | Record<string, string> {
	const source = readFileSync(resolve(ANGULAR_CONSTS, file), 'utf8');
	const start = source.indexOf(`export const ${exportName} = {`);
	if (start < 0) throw new Error(`${exportName} not found in ${file}`);
	let depth = 0;
	let end = start;
	for (let index = source.indexOf('{', start); index < source.length; index++) {
		if (source[index] === '{') depth++;
		else if (source[index] === '}' && --depth === 0) {
			end = index + 1;
			break;
		}
	}
	const body = source
		.slice(source.indexOf('{', start), end)
		.replace(/\/\/.*$/gm, '')
		.replace(/\b([A-Z]\w*)Component\b/g, '"$1"');
	// Object literal with quoted/unquoted keys and string/component values → evaluate as JS.
	return new Function(`return (${body});`)() as Record<string, Record<string, string>>;
}

type AsyncWidget = { __asyncLoader: () => Promise<{ __name?: string } | { default: { __name?: string } }> };

function isAsyncWidget(value: unknown): value is AsyncWidget {
	return Boolean(value && typeof value === 'object' && '__asyncLoader' in value);
}

/** The SFC's name (`<script setup>` sets `__name` from the file name), loading it if needed. */
async function widgetName(component: AsyncWidget): Promise<string> {
	const loaded = await component.__asyncLoader();
	const definition = 'default' in loaded ? loaded.default : loaded;
	return definition.__name ?? 'unknown';
}

/** The Vue map with each async component replaced by the name of the SFC it loads. */
async function vueNames(map: WidgetMap): Promise<Record<string, unknown>> {
	const entries = await Promise.all(
		Object.entries(map).map(async ([key, value]) => {
			if (isAsyncWidget(value)) return [key, await widgetName(value)];
			if (value && typeof value === 'object') return [key, await vueNames(value as WidgetMap)];
			return [key, value];
		}),
	);
	return Object.fromEntries(entries);
}

const CASES: [string, string, string, WidgetMap][] = [
	['record-edit-types.ts', 'UIwidgets', 'UIwidgets', recordEditTypes.UIwidgets],
	['record-edit-types.ts', 'recordEditTypes', 'recordEditTypes', recordEditTypes.recordEditTypes],
	['record-view-types.ts', 'UIwidgets', 'UIwidgets', recordViewTypes.UIwidgets],
	['record-view-types.ts', 'recordViewFieldTypes', 'recordViewFieldTypes', recordViewTypes.recordViewFieldTypes],
	['table-display-types.ts', 'UIwidgets', 'UIwidgets', tableDisplayTypes.UIwidgets],
	['table-display-types.ts', 'tableDisplayTypes', 'tableDisplayTypes', tableDisplayTypes.tableDisplayTypes],
	['filter-types.ts', 'UIwidgets', 'UIwidgets', filterTypes.UIwidgets],
	['filter-types.ts', 'filterTypes', 'filterTypes', filterTypes.filterTypes],
];

describe('widget type maps', () => {
	// Loading every widget SFC takes a few seconds on a cold transform cache.
	it.each(CASES)('%s %s matches the Angular map', { timeout: 30_000 }, async (file, angularName, _vueName, map) => {
		expect(await vueNames(map)).toEqual(angularMap(file, angularName));
	});

	it('keeps the timestamp tables from record-edit-types', () => {
		expect(recordEditTypes.timestampTypes).toContain('timestamp with time zone');
		expect(recordEditTypes.defaultTimestampValues.mysql).toEqual(['curdate', 'curtime', 'now']);
	});
});
