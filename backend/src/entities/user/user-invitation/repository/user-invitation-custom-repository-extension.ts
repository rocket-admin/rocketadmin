import { Constants } from '../../../../helpers/constants/constants';
import { Encryptor } from '../../../../helpers/encryption/encryptor';
import { UserEntity } from '../../user.entity';
import { UserInvitationEntity } from '../user-invitation.entity';

export const userInvitationCustomRepositoryExtension = {
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
    const qb = this.createQueryBuilder('user_invitation')
      .where('user_invitation.createdAt <= :date_ago', { date_ago: Constants.ONE_WEEK_AGO() });
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

  async createOrUpdateInvitationEntity(user: UserEntity): Promise<UserInvitationEntity> {
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
    return await this.save(newInvitation);
  },
};
