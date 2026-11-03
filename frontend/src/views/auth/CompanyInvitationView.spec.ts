import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountAuthView } from './authTestUtils';
import CompanyInvitationView from './CompanyInvitationView.vue';

const auth = vi.hoisted(() => ({ checkInvitationAvailability: vi.fn(), acceptCompanyInvitation: vi.fn() }));
const company = vi.hoisted(() => ({ fetchCompanyName: vi.fn() }));
const trackAuthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }));
vi.mock('@/stores/company', () => ({ useCompanyStore: () => company }));
vi.mock('@/components/auth/analytics', () => ({ trackAuthEvent }));
vi.mock('@/lib/password-strength', () => ({ loadPasswordScorer: () => new Promise(() => {}) }));

const PATTERN = '/company/:companyId/verify/:verificationToken';
const mountPage = () => mountAuthView(CompanyInvitationView, PATTERN, '/company/company-1/verify/invite-token');

describe('CompanyInvitationView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		company.fetchCompanyName.mockResolvedValue({ name: 'South Park' });
	});

	it('shows the skeleton while the link is being checked', async () => {
		auth.checkInvitationAvailability.mockReturnValue(new Promise(() => {}));
		const { wrapper } = await mountPage();

		expect(company.fetchCompanyName).toHaveBeenCalledWith('company-1');
		expect(auth.checkInvitationAvailability).toHaveBeenCalledWith('invite-token');
		expect(wrapper.find('[aria-label="Loading invitation"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('shows the invalid-link banner for a dead link', async () => {
		auth.checkInvitationAvailability.mockResolvedValue({ success: false });
		const { wrapper } = await mountPage();

		expect(wrapper.text()).toContain('Invitation link is invalid');
		expect(wrapper.find('a').attributes('href')).toBe('/login');
		wrapper.unmount();
	});

	it('joins with a password and a name, then goes to /connections-list', async () => {
		auth.checkInvitationAvailability.mockResolvedValue({ success: true });
		auth.acceptCompanyInvitation.mockResolvedValue({ expires: '2030-01-01' });
		const { wrapper, router } = await mountPage();

		expect(wrapper.find('[data-testid="invitation-company-name"]').text()).toBe('South Park');
		const join = () => wrapper.find('[data-testid="invitation-join-button"]');
		expect(join().attributes('disabled')).toBeDefined();

		await wrapper.find('input[name="password"]').setValue('Str0ngPass');
		await wrapper.find('[data-testid="invitation-name-input"]').setValue('Eric');
		expect(join().attributes('disabled')).toBeUndefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(auth.acceptCompanyInvitation).toHaveBeenCalledWith('invite-token', 'Str0ngPass', 'Eric');
		expect(trackAuthEvent).toHaveBeenCalledWith('Company invitation: invitation is accepted successfully');
		expect(router.currentRoute.value.path).toBe('/connections-list');
		wrapper.unmount();
	});

	it('names an unknown company', async () => {
		auth.checkInvitationAvailability.mockResolvedValue({ success: true });
		company.fetchCompanyName.mockResolvedValue({ name: '' });
		const { wrapper } = await mountPage();

		expect(wrapper.find('h1').text()).toContain('Unknown company');
		wrapper.unmount();
	});
});
