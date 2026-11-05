import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UuidRecordView from './UuidRecordView.vue';

describe('UuidRecordView', () => {
	it('renders the uuid', () => {
		const uuid = '550e8400-e29b-41d4-a716-446655440000';
		expect(mount(UuidRecordView, { props: { value: uuid } }).text()).toBe(uuid);
	});

	it('renders Null when empty', () => {
		expect(mount(UuidRecordView, { props: { value: null } }).text()).toBe('Null');
	});
});
