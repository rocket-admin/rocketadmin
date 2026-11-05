import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PointRecordView from './PointRecordView.vue';

const text = (value: unknown) => mount(PointRecordView, { props: { value } }).text();

describe('PointRecordView', () => {
	it('formats a string point', () => {
		expect(text('(1,2)')).toBe('(1, 2)');
		expect(text('3.5, -4')).toBe('(3.5, -4)');
	});

	it('formats an object point', () => {
		expect(text({ x: 3, y: 4 })).toBe('(3, 4)');
	});

	it('formats an array point', () => {
		expect(text([5, 6])).toBe('(5, 6)');
	});

	it('puts the point in the title', () => {
		expect(mount(PointRecordView, { props: { value: '(1,2)' } }).attributes('title')).toBe('(1, 2)');
	});

	it('renders nothing for null', () => {
		expect(
			mount(PointRecordView, { props: { value: null } })
				.find('span')
				.exists(),
		).toBe(false);
	});
});
