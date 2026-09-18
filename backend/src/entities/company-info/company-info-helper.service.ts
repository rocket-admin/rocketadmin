import { Injectable } from '@nestjs/common';

@Injectable()
export class CompanyInfoHelperService {
	// Plan 46 (2026-09-17): RocketAdmin is a free product with unlimited members — the 3-seat cap on
	// FREE_PLAN companies (users + pending invitations, checked against the saas subscription level)
	// is gone. The method stays as the single seam the invite flow consults, so a future member cap
	// has one place to land; it makes no saas round trip and needs no database.
	public canInviteMoreUsers(_companyId: string): Promise<boolean> {
		return Promise.resolve(true);
	}
}
