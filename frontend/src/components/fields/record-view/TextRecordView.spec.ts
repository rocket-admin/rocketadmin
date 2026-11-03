import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import TextRecordView from './TextRecordView.vue';

describe('TextRecordView', () => {
	it('renders the value, or a dash when empty', () => {
		expect(mount(TextRecordView, { props: { value: 'Ada' } }).text()).toBe('Ada');
		expect(mount(TextRecordView, { props: { value: '' } }).text()).toBe('—');
	});

	it('is valid without a validate param', () => {
		const wrapper = mount(TextRecordView, { props: { value: 'sometext', widgetStructure: mockWidgetStructure() } });
		expect(wrapper.classes()).not.toContain('text-record-view--invalid');
		expect(wrapper.attributes('title')).toBeUndefined();
	});

	it('flags a failed validator with its message', () => {
		const wrapper = mount(TextRecordView, {
			props: { value: 'notanemail', widgetStructure: mockWidgetStructure({ validate: 'isEmail' }) },
		});
		expect(wrapper.classes()).toContain('text-record-view--invalid');
		expect(wrapper.attributes('title')).toBe('Invalid email address');
	});

	it('passes a valid value', () => {
		const wrapper = mount(TextRecordView, {
			props: { value: 'test@test.com', widgetStructure: mockWidgetStructure({ validate: 'isEmail' }) },
		});
		expect(wrapper.classes()).not.toContain('text-record-view--invalid');
	});

	it('validates a regex pattern', () => {
		const wrapper = mount(TextRecordView, {
			props: { value: 'abc', widgetStructure: mockWidgetStructure({ validate: 'regex', regex: '^[0-9]+$' }) },
		});
		expect(wrapper.attributes('title')).toBe('Does not match the required pattern');
	});

	it('derives a message for validators without one', () => {
		const wrapper = mount(TextRecordView, {
			props: { value: 'zz', widgetStructure: mockWidgetStructure({ validate: 'isMACAddress' }) },
		});
		expect(wrapper.attributes('title')).toBe('Invalid macaddress');
	});

	it('never flags an empty value', () => {
		const wrapper = mount(TextRecordView, {
			props: { value: '', widgetStructure: mockWidgetStructure({ validate: 'isEmail' }) },
		});
		expect(wrapper.classes()).not.toContain('text-record-view--invalid');
	});
});
