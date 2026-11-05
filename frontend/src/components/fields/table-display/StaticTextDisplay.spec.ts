import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import StaticTextDisplay from './StaticTextDisplay.vue';
import { cellText, setupCopy } from './testing';

describe('StaticTextDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('displays the value, or a dash when empty', () => {
		expect(cellText(mount(StaticTextDisplay, { props: { value: 'Static content' } }))).toBe('Static content');
		expect(cellText(mount(StaticTextDisplay, { props: { value: null } }))).toBe('—');
	});

	it('copies the value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(StaticTextDisplay, { props: { value: 'x' }, attachTo }));
		expect(result).toEqual({ copied: ['x'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
