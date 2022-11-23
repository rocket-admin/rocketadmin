import { SubscriptionLevelEnum } from '../../../enums';

export function getPriceId(subscription: SubscriptionLevelEnum): string {
  switch (subscription) {
    case SubscriptionLevelEnum.TEAM_PLAN:
      return process.env.TEAM_PLAN_PRICE_ID;
    case SubscriptionLevelEnum.ANNUAL_TEAM_PLAN:
      return process.env.ANNUAL_TEAM_PLAN_PRICE_ID;
    case SubscriptionLevelEnum.ENTERPRISE_PLAN:
      return process.env.ENTERPRISE_PLAN_PRICE_ID;
    case SubscriptionLevelEnum.ANNUAL_ENTERPRISE_PLAN:
      return process.env.ANNUAL_ENTERPRISE_PLAN_PRICE_ID;
    default:
      return null;
  }
}
