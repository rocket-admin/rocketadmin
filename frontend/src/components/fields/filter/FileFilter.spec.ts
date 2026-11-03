import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FileFilter from './FileFilter.vue';

describe('FileFilter', () => {
	it('says file columns cannot be filtered', () => {
		const wrapper = mount(FileFilter, { props: { label: 'attachment' } });
		expect(wrapper.text()).toBe('Not available for filtering');
		expect(wrapper.emitted()).not.toHaveProperty('fieldChange');
	});
});
