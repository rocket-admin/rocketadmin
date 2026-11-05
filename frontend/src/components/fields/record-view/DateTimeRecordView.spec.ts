import { mount } from '@vue/test-utils';
import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import DateTimeRecordView from './DateTimeRecordView.vue';

describe('DateTimeRecordView', () => {
	it('formats a valid datetime', () => {
		const wrapper = mount(DateTimeRecordView, { props: { value: '2023-04-29T14:30:00' } });
		expect(wrapper.text()).toBe(format(new Date('2023-04-29T14:30:00'), 'P p'));
	});

	it('shows an invalid datetime as stored', () => {
		expect(mount(DateTimeRecordView, { props: { value: 'invalid' } }).text()).toBe('invalid');
	});

	it('renders a dash for null', () => {
		expect(mount(DateTimeRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
