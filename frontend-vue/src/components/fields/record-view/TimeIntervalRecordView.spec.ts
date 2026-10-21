import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TimeIntervalRecordView from './TimeIntervalRecordView.vue';

const text = (value: unknown) => mount(TimeIntervalRecordView, { props: { value } }).text();

describe('TimeIntervalRecordView', () => {
	it('formats an interval object', () => {
		expect(text({ hours: 2, minutes: 30 })).toBe('2h 30m');
		expect(text({ days: 1, seconds: 5, milliseconds: 10 })).toBe('1d 5s 10ms');
	});

	it('parses a JSON interval', () => {
		expect(text('{"hours":1,"minutes":15}')).toBe('1h 15m');
	});

	it('renders 0 for an empty interval', () => {
		expect(text({})).toBe('0');
	});

	it('shows an unparseable value as stored', () => {
		expect(text('01:30:00')).toBe('01:30:00');
	});

	it('renders a dash for null', () => {
		expect(text(null)).toBe('—');
	});
});
