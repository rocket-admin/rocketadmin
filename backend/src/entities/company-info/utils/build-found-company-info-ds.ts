import { FoundSassCompanyInfoDS } from '../../../microservices/gateways/saas-gateway.ts/data-structures/found-saas-company-info.ds.js';
import { FoundSipleConnectionInfoDS } from '../../connection/application/data-structures/found-connections.ds.js';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';
import { buildSimpleUserInfoDs } from '../../user/utils/build-created-user.ds.js';
import {
  FoundUserCompanyInfoDs,
  FoundUserFullCompanyInfoDs,
} from '../application/data-structures/found-company-info.ds.js';
import { FoundInvitationInCompanyDs } from '../application/data-structures/found-invitation-in-company.ds.js';
import { CompanyInfoEntity } from '../company-info.entity.js';

export function buildFoundCompanyFullInfoDs(
  companyInfoFromCore: CompanyInfoEntity,
  companyInfoFromSaas: FoundSassCompanyInfoDS | null,
  userRole: UserRoleEnum,
  companyCustomDomain: string | null,
): FoundUserFullCompanyInfoDs {
  if (!companyInfoFromCore.show_test_connections) {
    companyInfoFromCore.connections = companyInfoFromCore.connections.filter(
      (connection) => !connection.isTestConnection,
    );
  }
  const responseObject = buildFoundCompanyInfoDs(
    companyInfoFromCore,
    companyInfoFromSaas,
    companyCustomDomain,
    userRole,
  ) as any;
  const connectionsRO: Array<FoundSipleConnectionInfoDS> = companyInfoFromCore.connections.map((connection) => {
    return {
      id: connection.id,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      title: connection.title,
      isTestConnection: connection.isTestConnection,
      author: buildSimpleUserInfoDs(connection.author),
      groups: connection.groups.map((group) => {
        return {
          id: group.id,
          isMain: group.isMain,
          title: group.title,
          users: group.users.map((user) => buildSimpleUserInfoDs(user)).filter((user) => !!user),
        };
      }),
    };
  });
  responseObject.connections = connectionsRO;
  const invitationsRO: Array<FoundInvitationInCompanyDs> = companyInfoFromCore.invitations.map((invitation) => {
    return {
      id: invitation.id,
      verification_string: invitation.verification_string,
      groupId: invitation.groupId,
      inviterId: invitation.inviterId,
      invitedUserEmail: invitation.invitedUserEmail,
      role: invitation.role,
      createdAt: invitation.createdAt,
    };
  });
  responseObject.invitations = invitationsRO;
  return responseObject;
}

export function buildFoundCompanyInfoDs(
  companyInfoFromCore: CompanyInfoEntity,
  companyInfoFromSaas: FoundSassCompanyInfoDS | null,
  companyCustomDomain: string,
  userRole?: UserRoleEnum,
): FoundUserCompanyInfoDs {
  if (!companyInfoFromSaas) {
    return {
      id: companyInfoFromCore.id,
      name: companyInfoFromCore.name,
      is2faEnabled: companyInfoFromCore.is2faEnabled,
      show_test_connections: companyInfoFromCore.show_test_connections,
      custom_domain: companyCustomDomain ? companyCustomDomain : null,
    };
  }
  const isUserAdmin = userRole === UserRoleEnum.ADMIN;
  return {
    id: companyInfoFromCore.id,
    name: companyInfoFromCore.name,
    portal_link: isUserAdmin ? companyInfoFromSaas.portal_link : undefined,
    subscriptionLevel: companyInfoFromSaas.subscriptionLevel,
    is_payment_method_added: isUserAdmin ? companyInfoFromSaas.is_payment_method_added : undefined,
    is2faEnabled: isUserAdmin ? companyInfoFromCore.is2faEnabled : undefined,
    show_test_connections: companyInfoFromCore.show_test_connections,
    custom_domain: companyCustomDomain ? companyCustomDomain : null,
    createdAt: companyInfoFromSaas.createdAt,
    updatedAt: companyInfoFromSaas.updatedAt,
  };
}
