import { UserEntity } from '../../user.entity';
import { UserInvitationEntity } from '../user-invitation.entity';

export interface IUserInvitationRepository {
  createOrUpdateInvitationEntity(user: UserEntity, connectionOwnerId: string): Promise<UserInvitationEntity>;

  findUserInvitationWithVerificationString(verificationString: string): Promise<UserInvitationEntity>;

  removeInvitationEntity(entity: UserInvitationEntity): Promise<UserInvitationEntity>;

  saveInvitationEntity(entity: UserInvitationEntity): Promise<UserInvitationEntity>;

  removeOldInvitationEntities(): Promise<Array<UserInvitationEntity>>;
}
