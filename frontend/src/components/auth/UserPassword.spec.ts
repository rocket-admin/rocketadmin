import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import UserPassword from './UserPassword.vue';

vi.mock('@/lib/password-strength', () => ({
	loadPasswordScorer: () =>
		Promise.resolve({ check: () => ({ score: 4, feedback: { warning: null, suggestions: [] } }) }),
}));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('./analytics', () => ({ trackAuthEvent }));

const input = (wrapper: ReturnType<typeof mount>) => wrapper.find('input');

describe('UserPassword', () => {
	it('renders a required new-password input with the label and the strength meter', () => {
		const wrapper = mount(UserPassword, { props: { label: 'Enter new password', modelValue: '' } });

		expect(wrapper.find('label').text()).toContain('Enter new password');
		expect(input(wrapper).attributes('type')).toBe('password');
		expect(input(wrapper).attributes('required')).toBeDefined();
		expect(input(wrapper).attributes('minlength')).toBe('8');
		expect(wrapper.find('[role="progressbar"]').exists()).toBe(true);
	});

	it('emits typed values through v-model and tracks the change', async () => {
		const wrapper = mount(UserPassword, { props: { label: 'Password', modelValue: '' } });

		await input(wrapper).setValue('Secret123');

		expect(wrapper.emitted('update:modelValue')).toEqual([['Secret123']]);
		expect(trackAuthEvent).toHaveBeenCalledWith('Reg: password is changed');
	});

	it('toggles the password visibility', async () => {
		const wrapper = mount(UserPassword, { props: { label: 'Password', modelValue: 'Secret123' } });

		await wrapper.find('button[aria-label="Show password"]').trigger('click');
		expect(input(wrapper).attributes('type')).toBe('text');

		await wrapper.find('button[aria-label="Hide password"]').trigger('click');
		expect(input(wrapper).attributes('type')).toBe('password');
	});

	it('marks a weak password invalid and lists the unmet rules once the field is left', async () => {
		const wrapper = mount(UserPassword, { props: { label: 'Password', modelValue: 'secret' } });
		const element = input(wrapper).element as HTMLInputElement;

		expect(element.validity.customError).toBe(true);
		expect(wrapper.text()).not.toContain('Password must contain');

		await input(wrapper).trigger('blur');
		expect(wrapper.text()).toContain('Password must contain: an upper case letter, a number, at least 8 characters');
		expect(input(wrapper).attributes('aria-invalid')).toBe('true');

		await wrapper.setProps({ modelValue: 'Secret123' });
		expect(element.validity.customError).toBe(false);
		expect(wrapper.text()).not.toContain('Password must contain');
	});
});
