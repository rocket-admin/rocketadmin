import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LongTextRecordView from './LongTextRecordView.vue';

describe('LongTextRecordView', () => {
	it('renders the value', () => {
		expect(mount(LongTextRecordView, { props: { value: 'Some value' } }).text()).toBe('Some value');
	});

	it('renders a dash when empty', () => {
		expect(mount(LongTextRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
