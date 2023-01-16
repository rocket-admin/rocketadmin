import { Constants } from '../../../../helpers/constants/constants.js';
import { Encryptor } from '../../../../helpers/encryption/encryptor.js';
import { UserEntity } from '../../user.entity.js';
import { UserInvitationEntity } from '../user-invitation.entity.js';
import { IUserInvitationRepository } from './user-invitation-repository.interface.js';

export const userInvitationCustomRepositoryExtension: IUserInvitationRepository = {
  async findUserInvitationWithVerificationString(verificationString: string): Promise<UserInvitationEntity> {
    const qb = this.createQueryBuilder('user_invitation')
      .leftJoinAndSelect('user_invitation.user', 'user')
      .where('user_invitation.verification_string = :ver_string', {
        ver_string: verificationString,
      });
    return await qb.getOne();
  },

  async removeInvitationEntity(entity: UserInvitationEntity): Promise<UserInvitationEntity> {
    return await this.remove(entity);
  },

  async removeOldInvitationEntities(): Promise<Array<UserInvitationEntity>> {
    const qb = this.createQueryBuilder('user_invitation').where('user_invitation.createdAt <= :date_ago', {
      date_ago: Constants.ONE_WEEK_AGO(),
    });
    const foundEntities = await qb.getMany();
    return await Promise.all(
      foundEntities.map(async (invitation: UserInvitationEntity): Promise<UserInvitationEntity> => {
        return await this.remove(invitation);
      }),
    );
  },

  async saveInvitationEntity(entity: UserInvitationEntity): Promise<UserInvitationEntity> {
    return await this.save(entity);
  },

  async createOrUpdateInvitationEntity(user: UserEntity, connectionOwnerId: string): Promise<UserInvitationEntity> {
    const qb = this.createQueryBuilder('user_invitation')
      .leftJoinAndSelect('user_invitation.user', 'user')
      .where('user.id = :userId', { userId: user.id });
    const foundInvitation = await qb.getOne();
    if (foundInvitation) {
      await this.remove(foundInvitation);
    }
    const newInvitation = new UserInvitationEntity();
    newInvitation.verification_string = Encryptor.generateRandomString();
    newInvitation.user = user;
    newInvitation.ownerId = connectionOwnerId ? connectionOwnerId : null;
    return await this.save(newInvitation);
  },
};
