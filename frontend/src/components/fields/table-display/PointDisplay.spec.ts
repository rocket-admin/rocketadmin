import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import PointDisplay from './PointDisplay.vue';
import { setupCopy } from './testing';

const shown = (value: InstanceType<typeof PointDisplay>['$props']['value']) =>
	mount(PointDisplay, { props: { value } }).find('.point-display__value');

describe('PointDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('formats a point string', () => {
		expect(shown('(3.5, 7.2)').text()).toBe('(3.5, 7.2)');
		expect(shown('1,2').text()).toBe('(1, 2)');
	});

	it('formats a point object or array', () => {
		expect(shown({ x: 10, y: 20 }).text()).toBe('(10, 20)');
		expect(shown([1, 2]).text()).toBe('(1, 2)');
	});

	it('renders nothing for null', () => {
		expect(
			mount(PointDisplay, { props: { value: null } })
				.find('.table-display-cell')
				.exists(),
		).toBe(false);
	});

	it('copies the formatted point', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(PointDisplay, { props: { value: '(1,2)' }, attachTo }));
		expect(result).toEqual({ copied: ['(1, 2)'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
