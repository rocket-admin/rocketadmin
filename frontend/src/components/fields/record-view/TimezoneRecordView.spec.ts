import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TimezoneRecordView from './TimezoneRecordView.vue';

describe('TimezoneRecordView', () => {
	it('shows the zone with its UTC offset', () => {
		const text = mount(TimezoneRecordView, { props: { value: 'America/New_York' } }).text();
		expect(text).toMatch(/^America\/New_York \(UTC-0[45]:00\)$/);
	});

	it('shows +00:00 for UTC', () => {
		expect(mount(TimezoneRecordView, { props: { value: 'UTC' } }).text()).toBe('UTC (UTC+00:00)');
	});

	it('renders a dash for null', () => {
		expect(mount(TimezoneRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
