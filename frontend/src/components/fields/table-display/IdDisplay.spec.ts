import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import IdDisplay from './IdDisplay.vue';
import { setupCopy } from './testing';

describe('IdDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('displays the id right-aligned, or a dash when empty', () => {
		const wrapper = mount(IdDisplay, { props: { value: 42 } });
		expect(wrapper.get('.id-display__value').text()).toBe('42');
		expect(wrapper.classes()).toContain('table-display-cell--align-end');
		expect(
			mount(IdDisplay, { props: { value: null } })
				.get('.id-display__value')
				.text(),
		).toBe('—');
	});

	it('copies the value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(IdDisplay, { props: { value: 42 }, attachTo }));
		expect(result).toEqual({ copied: ['42'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
