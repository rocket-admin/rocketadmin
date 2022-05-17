import { TablePermissions } from './table';

export interface AuthUser {
    email: string,
    password: string
}

export interface UserGroup {
    id: string,
    title: string,
    isMain: boolean
}

export interface UserGroupInfo {
    group: {
        id: string,
        title: string,
        isMain: boolean
    },
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

export interface User {
    id: string,
    isActive: boolean,
    email: string,
    createdAt?: string,
    portal_link: string,
    subscriptionLevel: SubscriptionPlans
}

export enum AccessLevel {
    None = 'none',
    Readonly = 'readonly',
    Edit = 'edit'
}

export interface TablePermission {
    tableName: string,
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