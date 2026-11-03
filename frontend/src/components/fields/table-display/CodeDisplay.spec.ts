import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import CodeDisplay from './CodeDisplay.vue';
import { cellText, setupCopy } from './testing';

describe('CodeDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('displays the code, or a dash when empty', () => {
		expect(
			mount(CodeDisplay, { props: { value: 'console.log("hello")' } })
				.get('code')
				.text(),
		).toBe('console.log("hello")');
		expect(cellText(mount(CodeDisplay, { props: { value: null } }))).toBe('—');
	});

	it('copies the value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(CodeDisplay, { props: { value: 'x = 1' }, attachTo }));
		expect(result).toEqual({ copied: ['x = 1'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
