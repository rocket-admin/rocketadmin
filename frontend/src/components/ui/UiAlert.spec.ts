import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiAlert from './UiAlert.vue';

describe('UiAlert', () => {
	it('announces by default, because every call site shows an async result', () => {
		// None of the 9 pre-DS alerts announced at all — this default is the fix.
		expect(mount(UiAlert, { slots: { default: 'Boom' } }).attributes('role')).toBe('alert');
	});

	it('interrupts for error and warning, waits for success and info', () => {
		// assertive `alert` for a failure the user just caused; polite `status` for confirmation.
		const roleFor = (tone: 'error' | 'success' | 'info' | 'warning') =>
			mount(UiAlert, { props: { tone }, slots: { default: 'x' } }).attributes('role');

		expect(roleFor('error')).toBe('alert');
		expect(roleFor('warning')).toBe('alert');
		expect(roleFor('success')).toBe('status');
		expect(roleFor('info')).toBe('status');
	});

	it('drops the live region when live is false', () => {
		const wrapper = mount(UiAlert, { props: { live: false }, slots: { default: 'x' } });

		expect(wrapper.attributes('role')).toBeUndefined();
	});

	it('lands tone as a modifier class', () => {
		const wrapper = mount(UiAlert, { props: { tone: 'success' }, slots: { default: 'x' } });

		expect(wrapper.classes()).toContain('ui-alert--success');
	});

	it('defaults to the error tone', () => {
		expect(mount(UiAlert, { slots: { default: 'x' } }).classes()).toContain('ui-alert--error');
	});

	it('renders its slot content', () => {
		const wrapper = mount(UiAlert, { slots: { default: '<strong>Failed</strong> to save' } });

		expect(wrapper.text()).toBe('Failed to save');
	});
});
