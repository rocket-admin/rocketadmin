export interface ILogOutRepository {
  saveLogOutUserToken(token: string): Promise<void>;

  isLoggedOut(token: string): Promise<boolean>;

  cleanOldTokens(): Promise<void>;
}
