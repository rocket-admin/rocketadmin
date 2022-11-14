import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { ChangeUserNameDS } from '../application/data-structures/change-user-name.ds';
import { FoundUserDs } from '../application/data-structures/found-user.ds';
import { buildFoundUserDs } from '../utils/build-found-user.ds';
import { IChangeUserName } from './user-use-cases.interfaces';

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
