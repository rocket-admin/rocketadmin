import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StaticTextRecordView from './StaticTextRecordView.vue';

describe('StaticTextRecordView', () => {
	it('renders the value', () => {
		expect(mount(StaticTextRecordView, { props: { value: 'Some value' } }).text()).toBe('Some value');
	});

	it('renders a dash when empty', () => {
		expect(mount(StaticTextRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
