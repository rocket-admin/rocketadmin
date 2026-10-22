import { describe, expect, it } from 'vitest';
import { UIwidgets } from '@/consts/record-edit-types';
import { NO_SETTINGS, WIDGET_DEFAULT_PARAMS, WIDGET_DOCS_URLS, WIDGETS_WITH_SETTINGS } from './widget-defaults';

describe('widget defaults', () => {
	it('has default params for every widget type the picker offers', () => {
		expect(Object.keys(WIDGET_DEFAULT_PARAMS).sort()).toEqual(Object.keys(UIwidgets).sort());
	});

	it('makes the params read-only for the types without settings', () => {
		expect(WIDGETS_WITH_SETTINGS).toContain('Select');
		expect(WIDGETS_WITH_SETTINGS).not.toContain('Default');
		expect(WIDGETS_WITH_SETTINGS).not.toContain('JSON');
		expect(WIDGET_DEFAULT_PARAMS.Markdown).toBe(NO_SETTINGS);
	});

	it('links the docs of the documented types', () => {
		expect(WIDGET_DOCS_URLS.Boolean).toContain('widgets_management#boolean');
		expect(WIDGET_DOCS_URLS.Code).toContain('widgets_management#code');
		expect(WIDGET_DOCS_URLS.Default).toBeUndefined();
	});
});
