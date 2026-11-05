// Port of frontend/src/app/services/company.service.ts: the user's company, its members and
// invitations, and the SaaS custom domain.
//
// Angular pushed 'invited' | 'revoked' | 'role' | 'suspended' | 'unsuspended' | 'deleted' | 'domain'
// through `company.cast` and CompanyComponent refetched on each. Here the store keeps the company,
// its members and its custom domain as state, and each mutation refreshes the part it changed, so
// the company page only renders `company`, `members` and `customDomain`.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import { getConfig } from '@/config';
import { environment } from '@/environment';
import { AlertActionType, AlertType } from '@/models/alert';
import type { Company, CompanyMember, CompanyMemberRole } from '@/models/company';
import { useNotificationsStore } from '@/stores/notifications';

/** GET /company/my/full: the Company model plus the hostname on custom-domain deployments. */
export interface FullCompany extends Company {
	custom_domain?: string;
	show_test_connections?: boolean;
}

export interface CustomDomainInfo {
	id: string | null;
	companyId: string;
	hostname: string;
}

export interface CustomDomainResponse {
	success: boolean;
	domain_info?: CustomDomainInfo;
}

export const useCompanyStore = defineStore('company', () => {
	const company = ref<FullCompany | null>(null);
	const members = ref<CompanyMember[]>([]);
	const customDomain = ref<CustomDomainResponse | null>(null);
	/** True while the company and members are refetched after a member change (`submittingUsersChange`). */
	const refreshingMembers = ref(false);

	/** Whether the app is served from a customer's own domain rather than one of ours. */
	function isCustomDomain(hostname = window.location.hostname): boolean {
		return !environment.saasHostnames.includes(hostname);
	}

	async function fetchCompany(): Promise<FullCompany> {
		const data = await api.get<FullCompany>('/company/my/full', { notify: 'alert' });
		company.value = data;
		return data;
	}

	async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
		const data = await api.get<CompanyMember[]>(`/company/users/${companyId}`, { notify: 'alert' });
		members.value = data;
		return data;
	}

	function fetchCompanyName(companyId: string): Promise<{ name: string }> {
		return api.get<{ name: string }>(`/company/name/${companyId}`, { notify: 'snackbar' });
	}

	async function updateCompanyName(companyId: string, name: string): Promise<void> {
		await api.put(
			`/company/name/${companyId}`,
			{ name },
			{ notify: 'snackbar', successMessage: 'Company name has been updated.' },
		);
	}

	async function inviteCompanyMember(
		companyId: string,
		groupId: string,
		email: string,
		role: CompanyMemberRole,
		turnstileToken?: string,
	): Promise<void> {
		await api.put(
			`/company/user/${companyId}`,
			{ groupId, email, role, ...(turnstileToken ? { turnstileToken } : {}) },
			{ notify: 'snackbar', successMessage: `Invitation link has been sent to ${email}.` },
		);
		refreshCompanyAndMembers();
	}

	async function revokeInvitation(companyId: string, email: string): Promise<void> {
		await api.put(
			`/company/invitation/revoke/${companyId}`,
			{ email },
			{ notify: 'snackbar', successMessage: `Invitation has been revoked for ${email}.` },
		);
		refreshCompanyAndMembers();
	}

	async function removeCompanyMember(companyId: string, userId: string, email: string, userName: string) {
		const response = await api.delete(`/company/${companyId}/user/${userId}`, {
			notify: 'alert',
			successMessage: `${userName || email} has been removed from company.`,
		});
		refreshMembers(companyId);
		return response;
	}

	async function updateCompanyMemberRole(companyId: string, userId: string, role: CompanyMemberRole) {
		const response = await api.put(
			`/company/users/roles/${companyId}`,
			{ users: [{ userId, role }] },
			{ notify: 'alert', successMessage: 'Company member role has been updated.' },
		);
		refreshCompanyAndMembers();
		return response;
	}

	async function suspendCompanyMember(companyId: string, usersEmails: string[]) {
		const response = await api.put(
			`/company/users/suspend/${companyId}`,
			{ usersEmails },
			{ notify: 'alert', successMessage: 'Company member has been suspended.' },
		);
		refreshCompanyAndMembers();
		return response;
	}

	async function restoreCompanyMember(companyId: string, usersEmails: string[]) {
		const response = await api.put(
			`/company/users/unsuspend/${companyId}`,
			{ usersEmails },
			{ notify: 'alert', successMessage: 'Company member has been restored.' },
		);
		refreshCompanyAndMembers();
		return response;
	}

	async function getCustomDomain(companyId: string): Promise<CustomDomainResponse> {
		const data = await api.get<CustomDomainResponse>(`${getConfig().saasURL}/saas/custom-domain/${companyId}`, {
			notify: 'snackbar',
		});
		customDomain.value = data;
		return data;
	}

	async function createCustomDomain(companyId: string, hostname: string) {
		const response = await api.post(
			`${getConfig().saasURL}/saas/custom-domain/register/${companyId}`,
			{ hostname },
			{ notify: 'snackbar' },
		);
		const notifications = useNotificationsStore();
		notifications.showAlert(
			AlertType.Success,
			{
				abstract: `Now your admin panel is live on your own domain: ${hostname}`,
				details:
					'Check it out! If you have any issues or need help setting up your domain or CNAME record, please reach out to our support team.',
			},
			[
				{ type: AlertActionType.Anchor, caption: 'Open', to: `https://${hostname}` },
				{ type: AlertActionType.Button, caption: 'Dismiss', action: () => notifications.dismissAlert() },
			],
		);
		refreshCustomDomain(companyId);
		return response;
	}

	async function updateCustomDomain(companyId: string, hostname: string) {
		const response = await api.put(
			`${getConfig().saasURL}/saas/custom-domain/update/${companyId}`,
			{ hostname },
			{ notify: 'snackbar', successMessage: 'Custom domain has been updated.' },
		);
		refreshCustomDomain(companyId);
		return response;
	}

	async function deleteCustomDomain(companyId: string) {
		const response = await api.delete(`${getConfig().saasURL}/saas/custom-domain/delete/${companyId}`, {
			notify: 'snackbar',
			successMessage: 'Custom domain has been removed.',
		});
		refreshCustomDomain(companyId);
		return response;
	}

	// The refreshes swallow their errors: the client already showed them, and the mutation succeeded.
	async function refreshCompanyAndMembers(): Promise<void> {
		refreshingMembers.value = true;
		try {
			const fresh = await fetchCompany();
			await fetchCompanyMembers(fresh.id);
		} catch {
			// reported by the client
		} finally {
			refreshingMembers.value = false;
		}
	}

	async function refreshMembers(companyId: string): Promise<void> {
		refreshingMembers.value = true;
		try {
			await fetchCompanyMembers(companyId);
		} catch {
			// reported by the client
		} finally {
			refreshingMembers.value = false;
		}
	}

	async function refreshCustomDomain(companyId: string): Promise<void> {
		try {
			await getCustomDomain(companyId);
		} catch {
			// reported by the client
		}
	}

	return {
		company,
		members,
		customDomain,
		refreshingMembers,
		isCustomDomain,
		fetchCompany,
		fetchCompanyMembers,
		fetchCompanyName,
		updateCompanyName,
		inviteCompanyMember,
		revokeInvitation,
		removeCompanyMember,
		updateCompanyMemberRole,
		suspendCompanyMember,
		restoreCompanyMember,
		getCustomDomain,
		createCustomDomain,
		updateCustomDomain,
		deleteCustomDomain,
	};
});
