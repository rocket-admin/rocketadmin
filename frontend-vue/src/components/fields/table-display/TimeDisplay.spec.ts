import { mount } from '@vue/test-utils';
import { format } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import TimeDisplay from './TimeDisplay.vue';
import { cellText, setupCopy } from './testing';

describe('TimeDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows a time string as is', () => {
		expect(cellText(mount(TimeDisplay, { props: { value: '14:30:00' } }))).toBe('14:30:00');
	});

	it('formats a timestamp without a colon as HH:mm:ss', () => {
		const value = '2024-01-15';
		expect(cellText(mount(TimeDisplay, { props: { value } }))).toBe(format(new Date(value), 'HH:mm:ss'));
	});

	it('shows a dash for null', () => {
		expect(cellText(mount(TimeDisplay, { props: { value: null } }))).toBe('—');
	});

	it('copies the formatted time', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(TimeDisplay, { props: { value: '10:30:00' }, attachTo }));
		expect(result).toEqual({ copied: ['10:30:00'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
