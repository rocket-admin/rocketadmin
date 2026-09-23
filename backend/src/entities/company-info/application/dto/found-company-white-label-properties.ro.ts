import { ApiProperty } from '@nestjs/swagger';

// TEMPORARY (plan 46, 2026-09-17): white label is retired, but the deployed Angular shell still calls
// GET /company/white-label-properties/:companyId on every load. This RO is the empty answer that keeps
// it on the default logo/favicon/title. Delete together with the route once the frontend no longer
// asks (rocketadmin/frontend `app.component.ts` → `CompanyService.getWhiteLabelProperties`).
export class FoundCompanyWhiteLabelPropertiesRO {
	@ApiProperty({ type: 'object', nullable: true, properties: {} })
	logo: null;

	@ApiProperty({ type: 'object', nullable: true, properties: {} })
	favicon: null;

	@ApiProperty({ type: String, nullable: true })
	tab_title: null;

	@ApiProperty({ type: String, nullable: true })
	subscriptionLevel: null;
}

export const EMPTY_WHITE_LABEL_PROPERTIES: FoundCompanyWhiteLabelPropertiesRO = {
	logo: null,
	favicon: null,
	tab_title: null,
	subscriptionLevel: null,
};
