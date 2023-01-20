import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ChangeUserNameDS } from '../application/data-structures/change-user-name.ds.js';
import { FoundUserDs } from '../application/data-structures/found-user.ds.js';
import { buildFoundUserDs } from '../utils/build-found-user.ds.js';
import { IChangeUserName } from './user-use-cases.interfaces.js';

@Injectable()
export class ChangeUserNameUseCase extends AbstractUseCase<ChangeUserNameDS, FoundUserDs> implements IChangeUserName {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: ChangeUserNameDS): Promise<FoundUserDs> {
    const { id, name, password } = inputData;
    const foundUser = await this._dbContext.userRepository.findOneUserById(id);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordValidationResult = await Encryptor.verifyUserPassword(password, foundUser.password);
    if (!passwordValidationResult) {
      throw new HttpException(
        {
          message: Messages.LOGIN_DENIED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    foundUser.name = name;
    const savedUser = await this._dbContext.userRepository.saveUserEntity(foundUser);
    return await buildFoundUserDs(savedUser);
  }
}
