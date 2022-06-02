export interface ICognitoDecodedData {
  at_hash: string;
  sub: string;
  aud: string;
  email_verified: boolean;
  event_id: string;
  token_use: string;
  auth_time: number;
  iss: string;
  'cognito:username': string;
  exp: number;
  iat: number;
  email: string;
}

export interface IRequestWithCognitoInfo extends Request {
  query: any;
  decoded: ICognitoDecodedData;
  params: any;
}
