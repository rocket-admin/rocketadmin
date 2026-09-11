export enum SubscriptionLevelEnum {
	FREE_PLAN = 'FREE_PLAN',
	TEAM_PLAN = 'TEAM_PLAN',
	ENTERPRISE_PLAN = 'ENTERPRISE_PLAN',
	ANNUAL_TEAM_PLAN = 'ANNUAL_TEAM_PLAN',
	ANNUAL_ENTERPRISE_PLAN = 'ANNUAL_ENTERPRISE_PLAN',
	// SiteNova paid plan (saas plan 38): flat price + metered token overage. Reported by saas like the
	// others; every `=== FREE_PLAN` check here treats it as paid.
	SITENOVA_PAID_PLAN = 'SITENOVA_PAID_PLAN',
}
