export function getCookieDomainOptions(requestHostname: string): { domain: string } | undefined {
  const cookieDomain = process.env.ROCKETADMIN_COOKIE_DOMAIN;
  if (cookieDomain && requestHostname?.includes(cookieDomain)) {
    return { domain: cookieDomain };
  }
  return undefined;
}
