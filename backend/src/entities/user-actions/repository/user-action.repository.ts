import { EntityRepository, Repository } from 'typeorm';
import { UserActionEntity } from '../user-action.entity';
import { IUserActionRepository } from './user-action.repository.interface';

@EntityRepository(UserActionEntity)
export class UserActionRepository extends Repository<UserActionEntity> implements IUserActionRepository {
  constructor() {
    super();
  }

  public async saveNewOrUpdatedUserAction(userAction: UserActionEntity): Promise<UserActionEntity> {
    return await this.save(userAction);
  }
}
