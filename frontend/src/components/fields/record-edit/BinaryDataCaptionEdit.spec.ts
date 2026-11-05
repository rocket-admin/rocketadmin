import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BinaryDataCaptionEdit from './BinaryDataCaptionEdit.vue';

describe('BinaryDataCaptionEdit', () => {
	it('shows the label and the "binary data" caption', () => {
		const wrapper = mount(BinaryDataCaptionEdit, { props: { label: 'avatar_blob' } });
		expect(wrapper.text()).toContain('Avatar blob');
		expect(wrapper.find('[data-testid="record-avatar_blob-binary-data-caption"]').text()).toBe('binary data');
	});
});
