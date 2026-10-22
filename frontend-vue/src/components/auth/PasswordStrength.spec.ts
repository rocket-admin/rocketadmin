import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasswordScore } from '@/lib/password-strength';
import PasswordStrength from './PasswordStrength.vue';

const check = vi.fn(
	(_password: string): PasswordScore => ({
		score: 2,
		feedback: { warning: 'This is a common password.', suggestions: ['Add another word.', 'Avoid years.'] },
	}),
);

vi.mock('@/lib/password-strength', () => ({ loadPasswordScorer: () => Promise.resolve({ check }) }));

async function settle() {
	await vi.advanceTimersByTimeAsync(100);
	await flushPromises();
}

const bar = (wrapper: ReturnType<typeof mount>) => wrapper.find('[role="progressbar"]');

describe('PasswordStrength', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		check.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows an empty meter for an empty password without scoring it', async () => {
		const wrapper = mount(PasswordStrength, { props: { password: '' } });
		await settle();

		expect(bar(wrapper).attributes('aria-valuenow')).toBe('0');
		expect(wrapper.findAll('.password-strength__segment')).toHaveLength(5);
		expect(check).not.toHaveBeenCalled();
	});

	it('scores a too-short password 0 without feedback', async () => {
		const wrapper = mount(PasswordStrength, { props: { password: 'Ab1' } });
		await settle();

		expect(bar(wrapper).attributes('aria-valuenow')).toBe('20');
		expect(wrapper.emitted('strength-change')).toEqual([[0]]);
		expect(wrapper.find('[data-testid="password-strength-warning"]').exists()).toBe(false);
		expect(check).not.toHaveBeenCalled();
	});

	it('fills the meter from the zxcvbn score and shows its feedback', async () => {
		const wrapper = mount(PasswordStrength, { props: { password: 'password2024' } });
		await settle();

		expect(check).toHaveBeenCalledWith('password2024');
		// score 2 → (2 + 1) / 5 = 60 %
		expect(bar(wrapper).attributes('aria-valuenow')).toBe('60');
		expect(wrapper.find('.password-strength__overlay--warning').exists()).toBe(true);
		expect(wrapper.find('[data-testid="password-strength-warning"]').text()).toBe('This is a common password.');
		expect(wrapper.find('[data-testid="password-strength-suggestions"]').text()).toBe('Add another word. Avoid years.');
	});

	it('debounces scoring while typing', async () => {
		const wrapper = mount(PasswordStrength, { props: { password: 'longpassword1' } });
		await wrapper.setProps({ password: 'longpassword12' });
		await wrapper.setProps({ password: 'longpassword123' });
		await settle();

		expect(check).toHaveBeenCalledTimes(1);
		expect(check).toHaveBeenCalledWith('longpassword123');
	});
});
