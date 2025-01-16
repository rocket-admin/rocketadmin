type SaaSRequestMethods = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function sendRequestToSaasPart(
  route: string,
  method: SaaSRequestMethods,
  requestBody: Record<string, any>,
  authCookieValue: string,
): Promise<Response> {
  return await fetch(`http://rocketadmin-private-microservice:3001/${route}`, {
    method,
    body: JSON.stringify(requestBody),
    headers: {
      Cookie: authCookieValue,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}
