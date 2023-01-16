import { SubscriptionLevelEnum } from '../../../enums/index.js';

export function getSubscriptionLevelFromPriceId(priceId: string): SubscriptionLevelEnum {
  const teamPlanPriceId = process.env.TEAM_PLAN_PRICE_ID;
  const annulTemPlanPriceId = process.env.ANNUAL_TEAM_PLAN_PRICE_ID;
  const enterprisePlanPriceId = process.env.ENTERPRISE_PLAN_PRICE_ID;
  const annualEnterprisePlanId = process.env.ANNUAL_ENTERPRISE_PLAN_PRICE_ID;
  switch (priceId) {
    case teamPlanPriceId:
      return SubscriptionLevelEnum.TEAM_PLAN;
    case annulTemPlanPriceId:
      return SubscriptionLevelEnum.ANNUAL_TEAM_PLAN;
    case enterprisePlanPriceId:
      return SubscriptionLevelEnum.ENTERPRISE_PLAN;
    case annualEnterprisePlanId:
      return SubscriptionLevelEnum.ANNUAL_ENTERPRISE_PLAN;
    default:
      return SubscriptionLevelEnum.FREE_PLAN;
  }
}
