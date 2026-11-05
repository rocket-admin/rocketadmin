import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BinaryDataCaptionFilter from './BinaryDataCaptionFilter.vue';

describe('BinaryDataCaptionFilter', () => {
	it('renders the label and the "binary data" caption', () => {
		const wrapper = mount(BinaryDataCaptionFilter, { props: { label: 'avatar' } });
		expect(wrapper.text()).toContain('Avatar');
		expect(wrapper.find('[data-testid="record-avatar-binary-data-caption"]').text()).toBe('binary data');
	});
});
