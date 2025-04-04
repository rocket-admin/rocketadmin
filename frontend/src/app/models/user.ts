import { CompanyMemberRole } from './company';
import { TablePermissions } from './table';

export interface NewAuthUser {
    email: string,
    password: string,
}

export interface ExistingAuthUser {
    email: string,
    password: string,
    companyId: string
}

export interface UserGroup {
    id: string,
    title: string,
    isMain: boolean,
    users?: {
        id: string,
        isActive: boolean,
        email: string,
        createdAt?: string,
        name: string,
        is_2fa_enabled: boolean,
        role: CompanyMemberRole
    }[]
}

export interface UserGroupInfo {
    group: UserGroup,
    accessLevel: string
}

export interface GroupUser {
    id: string,
    createdAt: string,
    gclid: string | null,
    isActive: boolean,
    stripeId: string,
    email: string,
}

export enum SubscriptionPlans {
    free = 'FREE_PLAN',
    team = 'TEAM_PLAN',
    enterprise = 'ENTERPRISE_PLAN',
    teamAnnual = 'ANNUAL_TEAM_PLAN',
    enterpriseAnnual = 'ANNUAL_ENTERPRISE_PLAN',
}

export enum RegistrationProvider {
    Google = 'GOOGLE',
    Github = 'GITHUB'
}

export interface User {
    id: string,
    isActive: boolean,
    email: string,
    name?: string,
    createdAt?: string,
    portal_link: string,
    subscriptionLevel: SubscriptionPlans,
    is_2fa_enabled: boolean,
    role: CompanyMemberRole,
    externalRegistrationProvider: RegistrationProvider | null,
    company: {
        id: string,
    }
}

export enum AccessLevel {
    None = 'none',
    Readonly = 'readonly',
    Edit = 'edit'
}

export interface TablePermission {
    tableName: string,
    display_name: string,
    accessLevel: TablePermissions
}

export interface Permissions {
    connection: {
        connectionId: string,
        accessLevel: AccessLevel
    },
    group: {
        groupId: string,
        accessLevel: AccessLevel
    },
    tables: TablePermission[]
}

export interface ApiKey {
    title: string,
    id: string
}