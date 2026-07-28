export class AcceptUserValidationInCompany {
	userName: string;
	verificationString: string;
	userPassword: string;
}

// IToken fields (the legacy controller sets them as cookies) plus the accepted user's identity,
// so a satellite caller (rocketadmin-saas) can sign its own session cookie instead.
export class AcceptedCompanyInvitationDs {
	token: string;
	exp: Date;
	isTemporary: boolean;
	userId: string;
	userEmail: string;
	userName: string | null;
	companyId: string;
}
