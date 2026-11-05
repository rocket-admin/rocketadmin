import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RecordViewValue from './RecordViewValue.vue';

describe('RecordViewValue', () => {
	it('renders the slot in a span by default', () => {
		const wrapper = mount(RecordViewValue, { slots: { default: 'Ada' } });
		expect(wrapper.element.tagName).toBe('SPAN');
		expect(wrapper.classes()).toContain('record-view-value');
		expect(wrapper.text()).toBe('Ada');
	});

	it('renders the requested tag and passes attributes through', () => {
		const wrapper = mount(RecordViewValue, {
			props: { tag: 'a' },
			attrs: { href: 'tel:+1', title: 'Call' },
			slots: { default: '+1' },
		});
		expect(wrapper.element.tagName).toBe('A');
		expect(wrapper.attributes('href')).toBe('tel:+1');
		expect(wrapper.attributes('title')).toBe('Call');
	});
});
