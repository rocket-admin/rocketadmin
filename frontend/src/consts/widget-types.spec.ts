import { describe, expect, it } from 'vitest';
import * as filterTypes from './filter-types';
import * as recordEditTypes from './record-edit-types';
import * as recordViewTypes from './record-view-types';
import * as tableDisplayTypes from './table-display-types';
import ANGULAR_MAPS from './widget-types.angular.json';

/**
 * Parity guard for the widget type maps: every DB-type → widget table must keep exactly the keys
 * (and the same widget per key) as the Angular map it was ported from, because the row edit form,
 * the record view, the table cells and the filters all pick their widget from these tables.
 *
 * widget-types.angular.json is a snapshot of the Angular frontend/src/app/consts/*-types.ts maps
 * (component names without the `Component` suffix), taken before the Angular app was deleted.
 */
type WidgetMap = Record<string, unknown>;

function angularMap(file: string, exportName: string): unknown {
	return (ANGULAR_MAPS as Record<string, Record<string, unknown>>)[file]?.[exportName];
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
