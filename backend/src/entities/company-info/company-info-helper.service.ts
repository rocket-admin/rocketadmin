import { Injectable } from '@nestjs/common';

@Injectable()
export class CompanyInfoHelperService {
	// Plan 46 (2026-09-17): RocketAdmin is a free product with unlimited members. The 3-seat cap on
	// FREE_PLAN companies is gone. That cap counted users + pending invitations and checked them against
	// the saas subscription level. The method stays as the single seam that the invite flow consults, so
	// a future member cap has one place to land. It makes no saas round trip and needs no database.
	public canInviteMoreUsers(_companyId: string): Promise<boolean> {
		return Promise.resolve(true);
	}
}
