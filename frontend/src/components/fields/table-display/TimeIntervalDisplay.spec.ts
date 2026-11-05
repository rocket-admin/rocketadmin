import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import TimeIntervalDisplay from './TimeIntervalDisplay.vue';
import { cellText, setupCopy } from './testing';

const shown = (value: InstanceType<typeof TimeIntervalDisplay>['$props']['value']) =>
	cellText(mount(TimeIntervalDisplay, { props: { value } }));

describe('TimeIntervalDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('formats an interval object', () => {
		expect(shown({ days: 2, hours: 5, minutes: 30 })).toBe('2d 5h 30m');
		expect(shown({ seconds: 4, milliseconds: 20 })).toBe('4s 20ms');
	});

	it('parses interval JSON', () => {
		expect(shown('{"hours":1,"minutes":30}')).toBe('1h 30m');
	});

	it('shows 0 for an empty interval and a non-JSON string as is', () => {
		expect(shown({})).toBe('0');
		expect(shown('01:30:00')).toBe('01:30:00');
	});

	it('shows a dash for null', () => {
		expect(shown(null)).toBe('—');
	});

	it('copies the formatted interval', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(TimeIntervalDisplay, { props: { value: { days: 1 } }, attachTo }));
		expect(result).toEqual({ copied: ['1d'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
