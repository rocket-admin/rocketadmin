import { EntityRepository, getRepository, Repository } from 'typeorm';
import { LogOutEntity } from '../log-out.entity';
import { ILogOutRepository } from './log-out-repository.interface';
import { Constants } from '../../../helpers/constants/constants';

@EntityRepository(LogOutEntity)
export class LogOutRepository extends Repository<LogOutEntity> implements ILogOutRepository {
  constructor() {
    super();
  }

  public async saveLogOutUserToken(token: string): Promise<void> {
    const newLogOut = new LogOutEntity();
    newLogOut.jwtToken = token;
    await this.save(newLogOut);
  }

  public async isLoggedOut(token: string): Promise<boolean> {
    return !!(await this.findOne({ jwtToken: token }));
  }

  public async cleanOldTokens(): Promise<void> {
    const logOutQb = await getRepository(LogOutEntity)
      .createQueryBuilder('logout')
      .andWhere('logout.createdAt <= :date', { date: Constants.ONE_DAY_AGO() });
    const entitiesForRemoving = await logOutQb.getMany();
    if (entitiesForRemoving.length === 0) {
      return;
    }
    await this.remove(entitiesForRemoving);
  }
}
