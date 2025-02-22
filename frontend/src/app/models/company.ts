import { User } from "@sentry/angular-ivy"
import { SubscriptionPlans, UserGroup } from "./user"

export interface Address {
    street: string,
    number: string,
    complement: string,
    neighborhood: string,
    city: string,
    state: string,
    country: string,
    zipCode: string,
}

export interface CompanyConnection {
    id: string,
    createdAt: string,
    updatedAt: string,
    title: string,
    author: User,
    groups: UserGroup[],
}

export interface Company {
    id: string,
    additional_info?: string,
    name: string,
    address: Address | {},
    portal_link: string,
    subscriptionLevel: SubscriptionPlans,
    connections: CompanyConnection[],
    invitations: CompanyMemberInvitation[],
    is_payment_method_added: boolean,
}

export interface CompanyMember {
    id: string,
    isActive: boolean,
    name: string,
    email: string,
    is_2fa_enabled: boolean,
    role: CompanyMemberRole,
    has_groups: boolean
}

export enum CompanyMemberRole {
    CAO = 'ADMIN',
    SystemAdmin = 'DB_ADMIN',
    Specialist = 'USER',
}

export interface CompanyMemberInvitation {
    id: string,
    verification_string: string,
    groupId: string,
    inviterId: string,
    invitedUserEmail: string,
    role: CompanyMemberRole
}
