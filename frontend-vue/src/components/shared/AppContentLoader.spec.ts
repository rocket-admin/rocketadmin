import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AppContentLoader from './AppContentLoader.vue';

describe('AppContentLoader', () => {
	it('announces loading through the spinner', () => {
		const spinner = mount(AppContentLoader).get('.ui-spinner');

		expect(spinner.attributes('role')).toBe('status');
		expect(spinner.text()).toBe('Loading');
	});

	it('accepts a more specific label', () => {
		expect(mount(AppContentLoader, { props: { label: 'Loading filters' } }).text()).toBe('Loading filters');
	});
});
