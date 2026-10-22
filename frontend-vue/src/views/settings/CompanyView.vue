<script setup lang="ts">
// Port of frontend/src/app/components/company (/company): the company name, and the members table
// with pending invitations — roles, suspension, connection access, invite / delete / revoke.
//
// The store keeps company, members and custom domain as state and refreshes what each mutation
// changed (Angular refetched on `company.cast` events), so this page renders from the store.
//
// The custom domain is fetched on load like Angular did, but Angular's template renders no domain
// section any more (its handlers are unused), so there is none here either; DeleteDomainDialog is
// ported for parity.
import { orderBy } from 'lodash-es';
import { computed, onMounted, ref, watch } from 'vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import CompanyMemberAccess from '@/components/company/CompanyMemberAccess.vue';
import CompanyRoleMenu from '@/components/company/CompanyRoleMenu.vue';
import { COMPANY_ROLE_NAMES } from '@/components/company/companyRoles';
import DeleteMemberDialog, { type DeleteMemberDialogData } from '@/components/company/DeleteMemberDialog.vue';
import InviteMemberDialog from '@/components/company/InviteMemberDialog.vue';
import RevokeInvitationDialog, {
	type RevokeInvitationDialogData,
} from '@/components/company/RevokeInvitationDialog.vue';
import ProfileLayout from '@/components/profile/ProfileLayout.vue';
import PlaceholderCompany from '@/components/skeletons/PlaceholderCompany.vue';
import PlaceholderTableData from '@/components/skeletons/PlaceholderTableData.vue';
import { type TableColumn, UiButton, UiField, UiIcon, UiInput, UiSwitch, UiTable, vTooltip } from '@/components/ui';
import { useDialog } from '@/composables/useDialog';
import { environment } from '@/environment';
import {
	type CompanyMember,
	type CompanyMemberInvitation,
	CompanyMemberRole,
	type CompanyMembershipConnection,
} from '@/models/company';
import type { RegistrationProvider } from '@/models/user';
import { useCompanyStore } from '@/stores/company';
import { useUserStore } from '@/stores/user';

/** A members-table row: a member, or a pending invitation (`invitedUserEmail` set, `pending: true`). */
export interface CompanyTableRow {
	id: string;
	email: string;
	role: CompanyMemberRole;
	name?: string;
	invitedUserEmail?: string;
	pending?: boolean;
	is_2fa_enabled?: boolean;
	suspended?: boolean;
	has_groups?: boolean;
	user_membership?: CompanyMembershipConnection[];
	externalRegistrationProvider?: RegistrationProvider | null;
}

const AUTH_PROVIDER_ICONS: Record<string, string> = {
	GOOGLE: '/assets/icons/google.svg',
	GITHUB: '/assets/icons/github.svg',
};

const companyStore = useCompanyStore();
const userStore = useUserStore();
const dialog = useDialog();
const isSaas = environment.saas;

const companyName = ref('');
const nameDirty = ref(false);
const submittingChangedName = ref(false);
const submittingUsersChange = ref(false);
const loaded = ref(false);

const company = computed(() => companyStore.company);

const currentUser = computed<CompanyMember | undefined>(() => {
	const email = userStore.currentUser?.email;
	return email ? companyStore.members.find((member) => member.email === email) : undefined;
});
const isAdmin = computed(() => currentUser.value?.role === CompanyMemberRole.CAO);

const adminsCount = computed(
	() => companyStore.members.filter((member) => member.role === CompanyMemberRole.CAO).length,
);
const unsuspendedAdminsCount = computed(
	() => companyStore.members.filter((member) => member.role === CompanyMemberRole.CAO && !member.suspended).length,
);

/** Members by role then email, the signed-in account owner first, then the pending invitations. */
const members = computed<CompanyTableRow[]>(() => {
	const sorted: CompanyTableRow[] = orderBy(companyStore.members, ['role', 'email']);
	const me = currentUser.value;
	if (me?.role === CompanyMemberRole.CAO) {
		const index = sorted.findIndex((member) => member.email === me.email);
		if (index !== -1) sorted.unshift(...sorted.splice(index, 1));
	}
	const invitations = (company.value?.invitations ?? []).map(
		(invitee: CompanyMemberInvitation): CompanyTableRow => ({
			...invitee,
			email: invitee.invitedUserEmail,
			pending: true,
		}),
	);
	return [...sorted, ...invitations];
});

const columns = computed<TableColumn<CompanyTableRow>[]>(() => [
	{ key: 'email', label: 'Email' },
	{ key: 'name', label: 'Name' },
	{ key: 'role', label: 'Role' },
	{ key: 'twoFA', label: '2fa' },
	...(isAdmin.value ? [{ key: 'active', label: 'Suspended', align: 'center' as const }] : []),
	{ key: 'access', label: 'Access', align: 'center' },
]);

const showUsersPlaceholder = computed(() => submittingUsersChange.value || companyStore.refreshingMembers);

watch(
	() => company.value?.name,
	(name) => {
		companyName.value = name ?? '';
	},
	{ immediate: true },
);

onMounted(async () => {
	document.title = 'Company settings | Rocketadmin';
	if (!userStore.currentUser) userStore.fetchUser().catch(() => {});
	try {
		const fresh = await companyStore.fetchCompany();
		await companyStore.fetchCompanyMembers(fresh.id);
		loaded.value = true;
		if (!(companyStore.isCustomDomain() && isSaas)) companyStore.getCustomDomain(fresh.id).catch(() => {});
	} catch {
		// The store has shown the error.
	}
});

function canChangeRole(row: CompanyTableRow): boolean {
	return isAdmin.value && (adminsCount.value > 1 || row.role !== CompanyMemberRole.CAO) && !row.invitedUserEmail;
}

function canDelete(row: CompanyTableRow): boolean {
	return (
		(adminsCount.value > 1 && isAdmin.value) ||
		row.role === CompanyMemberRole.Member ||
		row.role === CompanyMemberRole.SystemAdmin
	);
}

function suspendDisabled(row: CompanyTableRow): boolean {
	return (
		unsuspendedAdminsCount.value === 1 && row.role === CompanyMemberRole.CAO && currentUser.value?.email === row.email
	);
}

function handleAddMemberDialogOpen() {
	trackAuthEvent('Company: invite member is clicked');
	if (company.value) dialog.open(InviteMemberDialog, { data: company.value });
}

function handleDeleteMemberDialogOpen(user: CompanyTableRow) {
	trackAuthEvent('Company: Delete member is clicked');
	if (!company.value) return;
	const data: DeleteMemberDialogData = {
		companyId: company.value.id,
		user: { id: user.id, email: user.email, name: user.name ?? '' },
	};
	dialog.open(DeleteMemberDialog, { data });
}

function handleRevokeInvitationDialogOpen(userEmail: string) {
	trackAuthEvent('Company: Revoke invitation is clicked');
	if (!company.value) return;
	const data: RevokeInvitationDialogData = { companyId: company.value.id, userEmail };
	dialog.open(RevokeInvitationDialog, { data });
}

async function changeCompanyName() {
	if (!company.value) return;
	submittingChangedName.value = true;
	try {
		await companyStore.updateCompanyName(company.value.id, companyName.value);
		trackAuthEvent('Company: company name is updated successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submittingChangedName.value = false;
	}
}

async function updateRole(userId: string, role: CompanyMemberRole) {
	if (!company.value) return;
	submittingUsersChange.value = true;
	try {
		await companyStore.updateCompanyMemberRole(company.value.id, userId, role);
		trackAuthEvent('Company: role is updated successfully');
	} catch {
		// The store has shown the error.
	} finally {
		submittingUsersChange.value = false;
	}
}

async function switchSuspendance(isSuspendance: boolean, memberEmail: string) {
	if (!company.value) return;
	trackAuthEvent('Company: suspend user is toggled', { enable: !isSuspendance });
	submittingUsersChange.value = true;
	try {
		if (isSuspendance) {
			await companyStore.suspendCompanyMember(company.value.id, [memberEmail]);
			trackAuthEvent('Company: member is suspended');
		} else {
			await companyStore.restoreCompanyMember(company.value.id, [memberEmail]);
			trackAuthEvent('Company: member is restored');
		}
	} catch {
		// The store has shown the error.
	} finally {
		submittingUsersChange.value = false;
	}
}
</script>

<template>
	<ProfileLayout active-tab="company">
		<PlaceholderCompany v-if="!loaded || !company || !currentUser" class="company__placeholder" />

		<div v-else class="company">
			<h1 class="company__title"><strong>{{ companyName }}</strong> company settings</h1>

			<form v-if="isAdmin" class="company__name-form" novalidate @submit.prevent="changeCompanyName">
				<UiField label="Company name" class="company__name-field">
					<UiInput
						v-model="companyName"
						name="company-name"
						data-testid="company-name-input"
						:disabled="submittingChangedName"
						@input="nameDirty = true"
						@change="trackAuthEvent('Company: company name is edited')"
					/>
				</UiField>
				<UiButton type="submit" variant="ghost" :disabled="!nameDirty || submittingChangedName">
					{{ submittingChangedName ? 'Saving' : 'Save' }}
				</UiButton>
			</form>

			<div class="company__table-header">
				<h2 class="company__heading">Members</h2>
				<UiButton v-if="isAdmin" data-testid="company-invitation-button" @click="handleAddMemberDialogOpen">
					Invite member
				</UiButton>
			</div>

			<PlaceholderTableData v-if="showUsersPlaceholder" />
			<UiTable
				v-else-if="members.length"
				:columns="columns"
				:rows="members"
				row-key="email"
				label="Company members"
				actions-label=""
				class="company__members"
			>
				<template #cell-email="{ row, index }">
					<span class="company__email" :data-testid="`company-member-email-${index}-cell`">
						<UiIcon
							v-if="row.externalRegistrationProvider === null"
							v-tooltip="'Email registration'"
							name="mail"
							size="sm"
							class="company__email-icon"
						/>
						<img
							v-else-if="row.externalRegistrationProvider"
							v-tooltip="`${row.externalRegistrationProvider} registration`"
							:src="AUTH_PROVIDER_ICONS[row.externalRegistrationProvider]"
							:alt="`${row.externalRegistrationProvider} registration`"
							class="company__email-icon"
						>
						<span>{{ row.email }}</span>
					</span>
				</template>

				<template #cell-name="{ row, index }">
					<span v-if="!row.invitedUserEmail" class="company__name" :data-testid="`company-member-name-${index}-cell`">
						{{ row.name || '—' }}
					</span>
				</template>

				<template #cell-role="{ row, index }">
					<CompanyRoleMenu
						v-if="canChangeRole(row)"
						:role="row.role"
						:label="`Role of ${row.email}`"
						:data-testid="`company-member-role-${index}-menu`"
						@open="trackAuthEvent('Company: role is clicked')"
						@select="updateRole(row.id, $event)"
					/>
					<span v-else class="company__role" :data-testid="`company-member-user-role-${index}-cell`">
						{{ COMPANY_ROLE_NAMES[row.role] }}
					</span>
				</template>

				<template #cell-twoFA="{ row, index }">
					<template v-if="!row.invitedUserEmail">
						<UiIcon
							v-if="row.is_2fa_enabled"
							name="done"
							label="2FA enabled"
							class="company__two-fa--on"
							:data-testid="`company-member-2fa-${index}-enabled-icon`"
						/>
						<UiIcon v-else name="remove" label="2FA disabled" :data-testid="`company-member-2fa-${index}-disabled-icon`" />
					</template>
				</template>

				<template #cell-active="{ row, index }">
					<UiSwitch
						v-if="!row.invitedUserEmail"
						:model-value="Boolean(row.suspended)"
						:disabled="suspendDisabled(row)"
						:aria-label="`Suspend ${row.email}`"
						:data-testid="`company-member-active-${index}-toggle`"
						@update:model-value="switchSuspendance($event, row.email)"
					/>
				</template>

				<template #header-access="{ column }">
					<span v-tooltip="'Access to connection'">{{ column.label }}</span>
				</template>
				<template #cell-access="{ row }">
					<CompanyMemberAccess
						v-if="!row.invitedUserEmail"
						:member="{ has_groups: Boolean(row.has_groups), user_membership: row.user_membership ?? [] }"
					/>
				</template>

				<template v-if="isAdmin" #actions="{ row, index }">
					<UiButton
						v-if="row.invitedUserEmail"
						variant="danger"
						size="sm"
						:data-testid="`company-member-revoke-${index}-button`"
						@click="handleRevokeInvitationDialogOpen(row.email)"
					>
						Revoke
					</UiButton>
					<UiButton
						v-else-if="canDelete(row)"
						variant="danger"
						size="sm"
						:data-testid="`company-member-delete-${index}-button`"
						@click="handleDeleteMemberDialogOpen(row)"
					>
						Delete
					</UiButton>
				</template>
			</UiTable>
		</div>
	</ProfileLayout>
</template>

<style scoped>
.company,
.company__placeholder {
	max-width: 1200px;
	margin: var(--space-10) auto;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
}

.company__title {
	margin: 0 0 var(--space-10);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-regular);
	color: var(--color-ink);
}

.company__name-form {
	display: flex;
	align-items: flex-end;
	gap: var(--space-2);
}

.company__name-field {
	flex: 1;
}

.company__table-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: var(--space-6) 0 var(--space-4);
}

.company__heading {
	margin: 0;
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
}

.company__members {
	margin-bottom: var(--space-8);
}

.company__email {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	max-width: 216px;
	overflow-wrap: anywhere;
}

.company__email-icon {
	flex: none;
	width: var(--space-4);
	height: var(--space-4);
}

.company__name {
	display: block;
	max-width: 200px;
	overflow-wrap: anywhere;
}

.company__role {
	padding: 0 var(--space-2);
}

.company__two-fa--on {
	color: var(--color-accent);
}

@media (width <= 600px) {
	.company,
	.company__placeholder {
		margin: var(--space-6) auto;
		padding: 0 var(--space-4);
	}

	.company__email,
	.company__name {
		max-width: 100%;
	}
}
</style>
