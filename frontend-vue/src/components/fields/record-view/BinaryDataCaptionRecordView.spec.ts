import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BinaryDataCaptionRecordView from './BinaryDataCaptionRecordView.vue';

describe('BinaryDataCaptionRecordView', () => {
	it('renders the caption', () => {
		expect(mount(BinaryDataCaptionRecordView, { props: { value: '(binary data)' } }).text()).toBe('(binary data)');
	});

	it('renders a dash when empty', () => {
		expect(mount(BinaryDataCaptionRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
