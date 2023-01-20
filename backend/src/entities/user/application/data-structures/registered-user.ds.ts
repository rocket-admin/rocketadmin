import { IToken } from '../../utils/generate-gwt-token.js';

export class RegisteredUserDs {
  id: string;
  email: string;
  token: IToken;
  name: string;
}
