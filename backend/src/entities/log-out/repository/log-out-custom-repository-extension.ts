import { Constants } from '../../../helpers/constants/constants';
import { LogOutEntity } from '../log-out.entity';

export const logOutCustomRepositoryExtension = {
  async saveLogOutUserToken(token: string): Promise<void> {
    const newLogOut = new LogOutEntity();
    newLogOut.jwtToken = token;
    await this.save(newLogOut);
  },

  async isLoggedOut(token: string): Promise<boolean> {
    const logOutQb = this.createQueryBuilder('logout').where('logout.jwtToken = :token', { token: token });
    return !!(await logOutQb.getOne());
  },

  async cleanOldTokens(): Promise<void> {
    const logOutQb = this.createQueryBuilder('logout').andWhere('logout.createdAt <= :date', {
      date: Constants.ONE_DAY_AGO(),
    });
    const entitiesForRemoving = await logOutQb.getMany();
    if (entitiesForRemoving.length === 0) {
      return;
    }
    await this.remove(entitiesForRemoving);
  },
};
