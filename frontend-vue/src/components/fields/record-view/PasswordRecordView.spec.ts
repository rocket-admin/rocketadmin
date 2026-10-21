import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PasswordRecordView from './PasswordRecordView.vue';

describe('PasswordRecordView', () => {
	it('masks the value', () => {
		const wrapper = mount(PasswordRecordView, { props: { value: 'hunter2' } });
		expect(wrapper.text()).toBe('••••••••');
		expect(wrapper.html()).not.toContain('hunter2');
	});
});
