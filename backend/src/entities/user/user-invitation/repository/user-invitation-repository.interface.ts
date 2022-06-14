import { UserInvitationEntity } from '../user-invitation.entity';
import { UserEntity } from '../../user.entity';

export interface IUserInvitationRepository {
  createOrUpdateInvitationEntity(user: UserEntity): Promise<UserInvitationEntity>;

  findUserInvitationWithVerificationString(verificationString: string): Promise<UserInvitationEntity>;

  removeInvitationEntity(entity: UserInvitationEntity): Promise<UserInvitationEntity>;

  saveInvitationEntity(entity: UserInvitationEntity): Promise<UserInvitationEntity>;

  removeOldInvitationEntities(): Promise<Array<UserInvitationEntity>>;
}
