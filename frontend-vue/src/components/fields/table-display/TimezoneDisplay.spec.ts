import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TimezoneDisplay from './TimezoneDisplay.vue';
import { cellText, setupCopy } from './testing';

describe('TimezoneDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows the zone with its UTC offset', () => {
		const text = cellText(mount(TimezoneDisplay, { props: { value: 'America/New_York' } }));
		expect(text).toMatch(/^America\/New_York \(UTC-0[45]:00\)$/);
	});

	it('shows +00:00 for UTC', () => {
		expect(cellText(mount(TimezoneDisplay, { props: { value: 'UTC' } }))).toBe('UTC (UTC+00:00)');
	});

	it('shows a dash for null', () => {
		expect(cellText(mount(TimezoneDisplay, { props: { value: null } }))).toBe('—');
	});

	it('copies the raw zone name', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(TimezoneDisplay, { props: { value: 'Europe/London' }, attachTo }));
		expect(result).toEqual({
			copied: ['Europe/London'],
			emitted: [['Timezone was copied to clipboard.']],
			rowClicked: false,
		});
	});
});
