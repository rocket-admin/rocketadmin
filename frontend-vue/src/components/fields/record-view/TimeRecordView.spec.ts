import { mount } from '@vue/test-utils';
import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import TimeRecordView from './TimeRecordView.vue';

describe('TimeRecordView', () => {
	it('keeps a time string as is', () => {
		expect(mount(TimeRecordView, { props: { value: '14:30:00' } }).text()).toBe('14:30:00');
	});

	it('formats a timestamp as HH:mm:ss', () => {
		const ms = new Date(2024, 0, 15, 9, 5, 7).getTime();
		expect(mount(TimeRecordView, { props: { value: ms } }).text()).toBe(format(ms, 'HH:mm:ss'));
	});

	it('renders a dash for null', () => {
		expect(mount(TimeRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
