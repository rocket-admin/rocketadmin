import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { CreateUserDs } from '../application/data-structures/create-user.ds.js';
import { FindUserDs } from '../application/data-structures/find-user.ds.js';
import { FoundUserDto } from '../dto/found-user.dto.js';
import { UserHelperService } from '../user-helper.service.js';
import { IFindUserUseCase } from './user-use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class FindUserUseCase
  extends AbstractUseCase<FindUserDs | CreateUserDs, FoundUserDto>
  implements IFindUserUseCase
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly amplitudeService: AmplitudeService,
    private readonly userHelperService: UserHelperService,
  ) {
    super();
  }

  protected async implementation(userData: FindUserDs | CreateUserDs): Promise<FoundUserDto> {
    const user = await this._dbContext.userRepository.findOneUserById(userData.id);
    if (user) {
      return await this.userHelperService.buildFoundUserDs(user);
    }
    throw new NotFoundException(Messages.USER_NOT_FOUND);
  }
}
