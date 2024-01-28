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

export interface Company {
    id: string,
    additional_info?: string,
    name: string,
    address: Address,
    portal_link: string,
    subscriptionLevel: string,
    connections: [],
    invitations: CompanyMemberInvitation[]
}

export interface CompanyMember {
    id: string,
    isActive: boolean,
    name: string,
    email: string,
    is_2fa_enabled: boolean,
    role: CompanyMemberRole
}

export enum CompanyMemberRole {
    SuperAdmin = 'ADMIN',
    Member = 'USER',
}

export interface CompanyMemberInvitation {
    id: string,
    verification_string: string,
    groupId: string,
    inviterId: string,
    invitedUserEmail: string,
    role: CompanyMemberRole
}
