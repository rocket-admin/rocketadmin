import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PasswordFilter from './PasswordFilter.vue';

describe('PasswordFilter', () => {
	it('blanks the masked value and emits it at once', () => {
		const wrapper = mount(PasswordFilter, { props: { label: 'password', value: '***' } });
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
		const input = wrapper.find('input[type="password"]').element as HTMLInputElement;
		expect(input.value).toBe('');
		expect(input.autocomplete).toBe('new-password');
	});

	it('emits the typed password', async () => {
		const wrapper = mount(PasswordFilter, { props: { label: 'password', value: '' } });
		await wrapper.find('input[type="password"]').setValue('secret');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['secret']);
	});

	it('emits null when "Clear password" is checked, and disables the input', async () => {
		const wrapper = mount(PasswordFilter, { props: { label: 'password', value: '' } });
		await wrapper.find('input[type="checkbox"]').setValue(true);
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([null]);
		expect((wrapper.find('input[type="password"]').element as HTMLInputElement).disabled).toBe(true);
	});

	it('only allows clearing an empty password', async () => {
		const wrapper = mount(PasswordFilter, { props: { label: 'password', value: '' } });
		const checkbox = () => wrapper.find('input[type="checkbox"]').element as HTMLInputElement;
		expect(checkbox().disabled).toBe(false);
		await wrapper.find('input[type="password"]').setValue('x');
		expect(checkbox().disabled).toBe(true);
	});

	it('shows the keep-blank hint', () => {
		const wrapper = mount(PasswordFilter, { props: { label: 'password' } });
		expect(wrapper.text()).toContain('To keep password the same keep this field blank.');
	});
});
