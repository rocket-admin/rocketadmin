import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import JsonEditorDisplay from './JsonEditorDisplay.vue';
import { setupCopy } from './testing';

const shown = (value: unknown) => mount(JsonEditorDisplay, { props: { value } }).get('code').text();

describe('JsonEditorDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('pretty-prints a JSON string', () => {
		expect(shown('{"name":"test","count":3}')).toBe(JSON.stringify({ name: 'test', count: 3 }, null, 2));
	});

	it('pretty-prints an already parsed value', () => {
		expect(shown([1, 2])).toBe(JSON.stringify([1, 2], null, 2));
	});

	it('shows invalid JSON as is', () => {
		expect(shown('not valid json')).toBe('not valid json');
	});

	it('renders nothing for an empty value', () => {
		expect(
			mount(JsonEditorDisplay, { props: { value: null } })
				.find('.table-display-cell')
				.exists(),
		).toBe(false);
	});

	it('copies the raw string, or the JSON of an object', async () => {
		let setup = setupCopy();
		let result = await setup.clickCopy(
			mount(JsonEditorDisplay, { props: { value: '{"a":1}' }, attachTo: setup.attachTo }),
		);
		expect(result).toEqual({ copied: ['{"a":1}'], emitted: [[COPIED_MESSAGE]], rowClicked: false });

		setup = setupCopy();
		result = await setup.clickCopy(mount(JsonEditorDisplay, { props: { value: { a: 1 } }, attachTo: setup.attachTo }));
		expect(result.copied).toEqual(['{"a":1}']);
	});
});
