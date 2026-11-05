import { mount } from '@vue/test-utils';
import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import DateRecordView from './DateRecordView.vue';

describe('DateRecordView', () => {
	it('formats a valid date in the short locale format', () => {
		const wrapper = mount(DateRecordView, { props: { value: '2023-04-29T00:00:00' } });
		expect(wrapper.text()).toBe(format(new Date('2023-04-29T00:00:00'), 'P'));
	});

	it('shows an invalid date as stored', () => {
		expect(mount(DateRecordView, { props: { value: 'invalid' } }).text()).toBe('invalid');
	});

	it('renders a dash for null', () => {
		expect(mount(DateRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
