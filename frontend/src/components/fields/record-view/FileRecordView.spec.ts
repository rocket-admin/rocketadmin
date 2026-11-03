import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FileRecordView from './FileRecordView.vue';

const text = (value: unknown) => mount(FileRecordView, { props: { value } }).text();

describe('FileRecordView', () => {
	it('shows Binary Data for Buffer blobs', () => {
		expect(text({ type: 'Buffer', data: [1, 2] })).toBe('Binary Data');
	});

	it('shows Binary Data for long strings', () => {
		expect(text('a]bcdefghijklmnopqrstu')).toBe('Binary Data');
	});

	it('shows short strings as is', () => {
		expect(text('short.txt')).toBe('short.txt');
	});

	it('shows a dash for null', () => {
		expect(text(null)).toBe('—');
	});
});
