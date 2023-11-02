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
): FoundUserFullCompanyInfoDs {
  const responseObject = buildFoundCompanyInfoDs(companyInfoFromCore, companyInfoFromSaas, userRole) as any;
  const connectionsRO: Array<FoundSipleConnectionInfoDS> = companyInfoFromCore.connections.map((connection) => {
    return {
      id: connection.id,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      title: connection.title,
      author: buildSimpleUserInfoDs(connection.author),
      groups: connection.groups.map((group) => {
        return {
          id: group.id,
          isMain: group.isMain,
          title: group.title,
          users: group.users.map((user) => buildSimpleUserInfoDs(user)),
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
  userRole?: UserRoleEnum,
): FoundUserCompanyInfoDs {
  if (!companyInfoFromSaas) {
    return {
      id: companyInfoFromCore.id,
    };
  }
  const isUserAdmin = userRole === UserRoleEnum.ADMIN;
  return {
    id: companyInfoFromCore.id,
    name: companyInfoFromSaas.name,
    additional_info: companyInfoFromSaas.additional_info,
    portal_link: isUserAdmin ? companyInfoFromSaas.portal_link : undefined,
    subscriptionLevel: isUserAdmin ? companyInfoFromSaas.subscriptionLevel : undefined,
    address: {
      id: companyInfoFromSaas.address?.id,
      city: companyInfoFromSaas.address?.city,
      complement: companyInfoFromSaas.address?.complement,
      country: companyInfoFromSaas.address?.country,
      createdAt: companyInfoFromSaas.address?.createdAt,
      neighborhood: companyInfoFromSaas.address?.neighborhood,
      number: companyInfoFromSaas.address?.number,
      state: companyInfoFromSaas.address?.state,
      street: companyInfoFromSaas.address?.street,
      updatedAt: companyInfoFromSaas.address?.updatedAt,
      zipCode: companyInfoFromSaas.address?.zipCode,
    },
    createdAt: companyInfoFromSaas.createdAt,
    updatedAt: companyInfoFromSaas.updatedAt,
  };
}
