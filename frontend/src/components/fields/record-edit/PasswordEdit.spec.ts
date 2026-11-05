import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PasswordEdit from './PasswordEdit.vue';

const passwordInput = (wrapper: ReturnType<typeof mount>) =>
	wrapper.find('input[type="password"]').element as HTMLInputElement;
const checkbox = (wrapper: ReturnType<typeof mount>) => wrapper.find('input[type="checkbox"]');

describe('PasswordEdit', () => {
	it('renders the label, the hint and a new-password input', () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'user_password', value: '' } });
		expect(wrapper.find('label').text()).toContain('User password');
		expect(wrapper.text()).toContain('To keep password the same keep this field blank.');
		expect(passwordInput(wrapper).autocomplete).toBe('new-password');
	});

	it('shows a masked password as empty and does not emit it', () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'pw', value: '***' } });
		expect(passwordInput(wrapper).value).toBe('');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
	});

	it('emits an actual initial value on mount', () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'pw', value: 'actualPassword' } });
		expect(wrapper.emitted('fieldChange')).toEqual([['actualPassword']]);
	});

	it('does not emit an empty initial value', () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'pw', value: '' } });
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
	});

	it('emits typed passwords, including whitespace, but not an emptied input', async () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'pw', value: '' } });
		const input = wrapper.find('input[type="password"]');
		await input.setValue('newPassword');
		await input.setValue('   ');
		await input.setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([['newPassword'], ['   ']]);
	});

	it('emits null when "Clear password" is ticked and disables the input', async () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'pw', value: '***' } });
		await checkbox(wrapper).setValue(true);
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
		expect(passwordInput(wrapper).disabled).toBe(true);
	});

	it('does not emit when "Clear password" is unticked', async () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'pw', value: '' } });
		await checkbox(wrapper).setValue(true);
		await checkbox(wrapper).setValue(false);
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});

	it('disables "Clear password" while a new password is typed', async () => {
		const wrapper = mount(PasswordEdit, { props: { label: 'pw', value: '' } });
		expect((checkbox(wrapper).element as HTMLInputElement).disabled).toBe(false);
		await wrapper.find('input[type="password"]').setValue('x');
		expect((checkbox(wrapper).element as HTMLInputElement).disabled).toBe(true);
	});
});
