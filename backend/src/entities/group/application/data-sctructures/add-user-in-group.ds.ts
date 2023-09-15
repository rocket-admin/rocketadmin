export class AddUserInGroupDs {
  email: string;
  groupId: string;
  companyId?: string;
  userSaasRole?: string;
}

export class AddUserInGroupWithSaaSDs {
  email: string;
  groupId: string;
  companyId: string;
  userSaasRole: string;
  inviterId: string;
}
