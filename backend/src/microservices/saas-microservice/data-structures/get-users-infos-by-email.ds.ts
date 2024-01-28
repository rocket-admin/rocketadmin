import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';

export class GetUsersInfosByEmailDS {
  userEmail: string;
  externalProvider: ExternalRegistrationProviderEnum;
}
