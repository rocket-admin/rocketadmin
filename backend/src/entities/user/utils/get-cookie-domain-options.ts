export function getCookieDomainOptions(): { domain: string } | undefined {
  const cookieDomain = process.env.ROCKETADMIN_COOKIE_DOMAIN;
  if (cookieDomain) {
    return { domain: cookieDomain };
  }
  return undefined;
}
