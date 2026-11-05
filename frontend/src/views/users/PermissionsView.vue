<script setup lang="ts">
// Port of frontend/src/app/components/users (UsersComponent), the `/permissions/:connectionId`
// page: the connection's user groups with their members, the public-access panel, and the entry
// points to the group, member and Cedar policy dialogs and to "view as group".
import { differenceBy } from 'lodash-es';
import { computed, reactive, ref, watch, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import PlaceholderUserGroup from '@/components/skeletons/PlaceholderUserGroup.vue';
import PlaceholderUserGroups from '@/components/skeletons/PlaceholderUserGroups.vue';
import { UiAccordion, UiButton, UiExpansionPanel, UiIconButton } from '@/components/ui';
import { trackUsersEvent } from '@/components/users/analytics';
import CedarPolicyEditorDialog from '@/components/users/CedarPolicyEditorDialog.vue';
import GroupAddDialog from '@/components/users/GroupAddDialog.vue';
import GroupDeleteDialog from '@/components/users/GroupDeleteDialog.vue';
import GroupNameEditDialog from '@/components/users/GroupNameEditDialog.vue';
import PublicAccessPanel from '@/components/users/PublicAccessPanel.vue';
import type { CedarPolicyEditorDialogData, UserAddDialogData, UserDeleteDialogData } from '@/components/users/types';
import UserAddDialog from '@/components/users/UserAddDialog.vue';
import UserDeleteDialog from '@/components/users/UserDeleteDialog.vue';
import { useDialog } from '@/composables/useDialog';
import type { CompanyMember } from '@/models/company';
import type { GroupUser, UserGroup, UserGroupInfo } from '@/models/user';
import { useCedarPermissionsStore } from '@/stores/cedar-permissions';
import { useCompanyStore } from '@/stores/company';
import { useConnectionsStore } from '@/stores/connections';
import { useUserStore } from '@/stores/user';
import { useUsersStore } from '@/stores/users';
import { VIEW_AS_PARAM } from '@/stores/view-as';

const users = useUsersStore();
const userStore = useUserStore();
const connections = useConnectionsStore();
const company = useCompanyStore();
const permissions = useCedarPermissionsStore();
const dialog = useDialog();
const router = useRouter();

const connectionId = computed(() => connections.connectionID);
const companyMembers = ref<CompanyMember[]>([]);
/** Expanded state per group; every group starts expanded. */
const openGroups = reactive<Record<string, boolean>>({});

/** null while the first load is in flight (the skeleton shows), then the list. */
const groups = computed<UserGroupInfo[] | null>(() =>
	users.groups.length > 0 || !users.groupsLoading ? users.groups : null,
);

const companyMembersWithoutAccess = computed(() => {
	const allGroupUsers = Object.values(users.groupUsers).flatMap((list) => (list === 'empty' ? [] : list));
	return differenceBy(companyMembers.value, allGroupUsers, 'email');
});

const canCreateGroup = computed(() => !!permissions.canI('group:edit', 'Group', connectionId.value).value);
// Matches ConnectionEditGuard on the public-permissions endpoints.
const canEditConnection = computed(() => !!permissions.canI('connection:edit', 'Connection', connectionId.value).value);

watchEffect(() => {
	document.title = `User permissions - ${connections.connectionTitle} | Rocketadmin`;
});

// Fetch the members of every group whenever the group list (re)loads.
watch(
	() => users.groups,
	(list) => {
		if (list.length > 0) users.fetchAllGroupUsers(list);
	},
	{ immediate: true },
);

watch(
	() => userStore.currentUser?.company.id,
	async (companyId) => {
		if (!companyId) return;
		try {
			companyMembers.value = await company.fetchCompanyMembers(companyId);
		} catch {
			// Reported by the store.
		}
	},
	{ immediate: true },
);

function canManageGroup(groupId: string): boolean {
	return !!permissions.canI('group:edit', 'Group', groupId).value;
}

function getGroupUsers(groupId: string): GroupUser[] | null {
	const list = users.groupUsers[groupId];
	if (!list || list === 'empty') return null;
	return list;
}

function getUserInitials(user: GroupUser): string {
	const name = user.name?.trim();
	if (name) {
		const parts = name.split(/\s+/);
		const [first = '', second = ''] = parts;
		if (second) return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
		return (first[0] ?? '').toUpperCase();
	}
	return (user.email[0] ?? '').toUpperCase();
}

function isGroupOpen(groupId: string): boolean {
	return openGroups[groupId] ?? true;
}

/** An href rather than a RouterLink: the page opens in a new tab, in view-as mode from its first load. */
function viewAsHref(groupId: string): string {
	return router.resolve({ path: `/permissions/${connectionId.value}`, query: { [VIEW_AS_PARAM]: groupId } }).href;
}

function openCedarPolicyDialog(group: Pick<UserGroup, 'id' | 'title' | 'cedarPolicy'>) {
	const data: CedarPolicyEditorDialogData = {
		groupId: group.id,
		groupTitle: group.title,
		cedarPolicy: group.cedarPolicy ?? null,
	};
	dialog.open(CedarPolicyEditorDialog, { data });
}

async function openCreateUsersGroupDialog() {
	trackUsersEvent('Users access: add group is clicked');
	const createdGroup = await dialog.open<UserGroup | null>(GroupAddDialog).afterClosed();
	if (createdGroup) openCedarPolicyDialog({ ...createdGroup, cedarPolicy: null });
}

function openAddUserDialog(group: UserGroup) {
	trackUsersEvent('Users access: add user is clicked');
	const list = users.groupUsers[group.id];
	const availableMembers = differenceBy(companyMembers.value, list === 'empty' ? [] : (list ?? []), 'email');
	dialog.open<unknown, UserAddDialogData>(UserAddDialog, { data: { availableMembers, group } });
}

function openDeleteGroupDialog(group: UserGroup) {
	trackUsersEvent('Users access: delete group is clicked');
	dialog.open(GroupDeleteDialog, { data: group });
}

function openEditGroupNameDialog(group: UserGroup) {
	trackUsersEvent('Users access: edit group name is clicked');
	dialog.open(GroupNameEditDialog, { data: group });
}

function onCedarPolicyClick(group: UserGroup) {
	trackUsersEvent('Users access: cedar policy is clicked');
	openCedarPolicyDialog(group);
}

function openDeleteUserDialog(user: GroupUser, group: UserGroup) {
	trackUsersEvent('Users access: delete user is clicked');
	dialog.open<unknown, UserDeleteDialogData>(UserDeleteDialog, { data: { user, group } });
}
</script>

<template>
	<div class="permissions">
		<header class="permissions__header">
			<h1 class="permissions__title">User groups</h1>
			<UiButton v-if="canCreateGroup" variant="secondary" @click="openCreateUsersGroupDialog">New group</UiButton>
		</header>

		<PlaceholderUserGroups v-if="groups === null" />

		<PublicAccessPanel v-if="canEditConnection" />

		<UiAccordion v-if="groups" multi class="permissions__groups">
			<UiExpansionPanel
				v-for="groupItem in groups"
				:key="groupItem.group.id"
				:open="isGroupOpen(groupItem.group.id)"
				:class="['permissions__group', { 'permissions__group--admin': groupItem.group.title === 'Admin' }]"
				data-testid="user-group"
				@update:open="openGroups[groupItem.group.id] = $event"
			>
				<template #title>
					<span class="permissions__group-title">
						<span>{{ groupItem.group.title }}</span>
						<span v-if="groupItem.group.title === 'Admin'" class="permissions__system-badge">system</span>
					</span>
				</template>

				<template v-if="getGroupUsers(groupItem.group.id)" #description>
					<span class="permissions__members-preview">
						<span
							v-for="user in getGroupUsers(groupItem.group.id)?.slice(0, 3)"
							:key="user.email"
							v-tooltip="user.name || user.email"
							class="permissions__avatar"
							aria-hidden="true"
						>
							{{ getUserInitials(user) }}
						</span>
						<span class="permissions__members-count">
							{{ getGroupUsers(groupItem.group.id)?.length }}
							{{ getGroupUsers(groupItem.group.id)?.length === 1 ? 'member' : 'members' }}
						</span>
					</span>
				</template>

				<template #actions>
					<span class="permissions__group-actions">
						<UiIconButton
							v-if="canManageGroup(groupItem.group.id) && groupItem.group.title !== 'Admin'"
							icon="edit"
							label="Edit group name"
							size="sm"
							@click="openEditGroupNameDialog(groupItem.group)"
						/>
						<UiIconButton
							icon="visibility"
							label="View as group (opens in new tab)"
							size="sm"
							:href="viewAsHref(groupItem.group.id)"
							target="_blank"
							@click="trackUsersEvent('Users access: view as group is clicked')"
						/>
						<template v-if="canManageGroup(groupItem.group.id) && groupItem.group.title !== 'Admin'">
							<UiIconButton
								icon="vpn_key"
								label="Edit policy"
								size="sm"
								@click="onCedarPolicyClick(groupItem.group)"
							/>
							<UiIconButton
								icon="delete"
								label="Delete group"
								size="sm"
								@click="openDeleteGroupDialog(groupItem.group)"
							/>
						</template>
						<UiIconButton
							v-if="canManageGroup(groupItem.group.id)"
							icon="person_add"
							label="Add user"
							size="sm"
							@click="openAddUserDialog(groupItem.group)"
						/>
					</span>
				</template>

				<PlaceholderUserGroup v-if="users.groupUsers[groupItem.group.id] === undefined" />
				<p v-if="users.groupUsers[groupItem.group.id] === 'empty'" class="permissions__empty">
					No users in the group
				</p>
				<ul class="permissions__users">
					<li v-for="user in getGroupUsers(groupItem.group.id) ?? []" :key="user.email" class="permissions__user">
						<div class="permissions__user-label">
							<template v-if="user.name">
								<span class="permissions__user-name">{{ user.name }}</span>
								<span class="permissions__user-email">{{ user.email }}</span>
							</template>
							<span v-else class="permissions__user-name">{{ user.email }}</span>
						</div>
						<UiIconButton
							v-if="userStore.currentUser?.email !== user.email && canManageGroup(groupItem.group.id)"
							icon="person_remove"
							label="Delete user"
							size="sm"
							@click="openDeleteUserDialog(user, groupItem.group)"
						/>
					</li>
				</ul>
			</UiExpansionPanel>
		</UiAccordion>

		<p v-if="companyMembersWithoutAccess.length > 0" class="permissions__no-access" data-testid="members-without-access">
			Company members who do NOT have access to this connection:
			<span v-for="(member, index) in companyMembersWithoutAccess" :key="member.id">
				<strong>{{ member.name }}</strong> ({{ member.email }}){{ index < companyMembersWithoutAccess.length - 1 ? ', ' : '' }}
			</span>
		</p>
	</div>
</template>

<style scoped>
.permissions {
	width: clamp(18.75em, 96%, 42em);
	margin: 0 auto;
	padding-bottom: var(--space-8);
}

.permissions__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: var(--space-8) 0 var(--space-4);
}

.permissions__title {
	margin: 0;
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.permissions__groups {
	display: flex;
	flex-direction: column;
}

.permissions__group--admin {
	margin-bottom: var(--space-5);
}

.permissions__group-title {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
}

.permissions__system-badge {
	padding: var(--space-05) var(--space-2);
	border-radius: var(--radius-pill);
	background: var(--color-paper-2);
	color: var(--color-accent);
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
	letter-spacing: 0.03em;
	text-transform: uppercase;
}

/* Like the Angular panel header: the actions show on hover, focus or while the group is expanded. */
.permissions__group:not(.ui-expansion-panel--open):not(:hover):not(:focus-within) .permissions__group-actions {
	visibility: hidden;
}

.permissions__group-actions {
	display: flex;
	align-items: center;
}

.permissions__members-preview {
	display: inline-flex;
	align-items: center;
}

.permissions__avatar {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	height: 1.25rem;
	margin-inline-start: -0.2rem;
	border: 1.5px solid var(--color-surface);
	border-radius: 50%;
	background: var(--color-paper-2);
	color: var(--color-accent);
	font-size: var(--text-2xs);
	font-weight: var(--weight-semibold);
}

.permissions__avatar:first-child {
	margin-inline-start: 0;
}

.permissions__members-count {
	margin-inline-start: var(--space-2);
	font-size: var(--text-xs);
	color: var(--color-muted);
	white-space: nowrap;
}

.permissions__empty {
	margin: 0;
	font-size: var(--text-sm);
}

.permissions__users {
	margin: 0;
	padding: 0;
	list-style: none;
}

.permissions__user {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--space-2) 0;
}

.permissions__user-label {
	display: flex;
	flex-direction: column;
}

.permissions__user-name {
	font-size: var(--text-sm);
	color: var(--color-ink);
}

.permissions__user-email {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.permissions__no-access {
	margin-top: var(--space-8);
	font-size: var(--text-sm);
}

@media (width <= 600px) {
	.permissions {
		width: 100%;
		padding: 0 var(--space-4);
		box-sizing: border-box;
	}

	.permissions__header {
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: var(--space-4) 0 var(--space-3);
	}
}
</style>
