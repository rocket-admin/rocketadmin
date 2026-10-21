import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import IdRecordView from './IdRecordView.vue';

describe('IdRecordView', () => {
	it('renders the value', () => {
		expect(mount(IdRecordView, { props: { value: 'Some value' } }).text()).toBe('Some value');
	});

	it('renders a dash when empty', () => {
		expect(mount(IdRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
