// The company roles as the company page and the invite dialog name and describe them.
import { CompanyMemberRole } from '@/models/company';

export const COMPANY_ROLE_NAMES: Record<CompanyMemberRole, string> = {
	[CompanyMemberRole.CAO]: 'Account Owner',
	[CompanyMemberRole.SystemAdmin]: 'System Admin',
	[CompanyMemberRole.Member]: 'Member',
};

export interface CompanyRoleOption {
	role: CompanyMemberRole;
	/** Two lines, as the Angular menu broke them. */
	description: [string, string];
}

export const COMPANY_ROLE_OPTIONS: CompanyRoleOption[] = [
	{
		role: CompanyMemberRole.CAO,
		description: ['Can manage company information,', 'and has full control over databases'],
	},
	{
		role: CompanyMemberRole.SystemAdmin,
		description: ['Can view company information,', 'and has full control over databases'],
	},
	{
		role: CompanyMemberRole.Member,
		description: ['Can view company information,', 'and can manage existing databases'],
	},
];
