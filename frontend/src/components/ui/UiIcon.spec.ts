import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiIcon from './UiIcon.vue';

describe('UiIcon', () => {
	it('renders the ligature name in the Material Symbols font class', () => {
		const wrapper = mount(UiIcon, { props: { name: 'chevron_right' } });

		expect(wrapper.text()).toBe('chevron_right');
		expect(wrapper.classes()).toContain('material-symbols-outlined');
	});

	it('is decorative by default, so the ligature name is never read aloud', () => {
		const wrapper = mount(UiIcon, { props: { name: 'delete' } });

		expect(wrapper.attributes('aria-hidden')).toBe('true');
		expect(wrapper.attributes('role')).toBeUndefined();
	});

	it('becomes a named image when given a label', () => {
		const wrapper = mount(UiIcon, { props: { name: 'warning', label: 'Warning' } });

		expect(wrapper.attributes('role')).toBe('img');
		expect(wrapper.attributes('aria-label')).toBe('Warning');
		expect(wrapper.attributes('aria-hidden')).toBeUndefined();
	});

	it('opts out of page translation, which would break the ligature', () => {
		expect(mount(UiIcon, { props: { name: 'home' } }).attributes('translate')).toBe('no');
	});

	it('lands size and filled as modifier classes', () => {
		expect(mount(UiIcon, { props: { name: 'home' } }).classes()).toContain('ui-icon--size-md');
		const wrapper = mount(UiIcon, { props: { name: 'home', size: 'lg', filled: true } });

		expect(wrapper.classes()).toContain('ui-icon--size-lg');
		expect(wrapper.classes()).toContain('ui-icon--filled');
	});
});
