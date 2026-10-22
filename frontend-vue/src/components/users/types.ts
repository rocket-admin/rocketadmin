// Shapes shared by the permissions page (views/users/PermissionsView.vue) and its dialogs.
import type { CompanyMember } from '@/models/company';
import type { GroupUser, UserGroup } from '@/models/user';

/** A table the policy builder can scope an action to. */
export interface AvailableTable {
	tableName: string;
	displayName: string;
}

/** A dashboard the policy builder can scope an action to. */
export interface AvailableDashboard {
	id: string;
	name: string;
}

export interface CedarPolicyEditorDialogData {
	groupId: string;
	groupTitle: string;
	cedarPolicy?: string | null;
}

/** The group a dialog acts on: only its id and title are read. */
export type GroupRef = Pick<UserGroup, 'id' | 'title'>;

export interface UserAddDialogData {
	/** Company members not yet in the group. */
	availableMembers: Pick<CompanyMember, 'id' | 'email' | 'name'>[];
	group: GroupRef;
}

export interface UserDeleteDialogData {
	user: Pick<GroupUser, 'email' | 'name'>;
	group: GroupRef;
}
