import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import LongTextDisplay from './LongTextDisplay.vue';
import { cellText, setupCopy } from './testing';

describe('LongTextDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('displays the value, or a dash when empty', () => {
		const text = 'This is a long text value for testing';
		expect(cellText(mount(LongTextDisplay, { props: { value: text } }))).toBe(text);
		expect(cellText(mount(LongTextDisplay, { props: { value: null } }))).toBe('—');
	});

	it('copies the value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(LongTextDisplay, { props: { value: 'long' }, attachTo }));
		expect(result).toEqual({ copied: ['long'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
