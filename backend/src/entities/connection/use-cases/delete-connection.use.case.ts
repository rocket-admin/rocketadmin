import AbstractUseCase from '../../../common/abstract-use.case';
import { BaseType } from '../../../common/data-injection.tokens';
import { buildCreatedConnectionDs } from '../utils/build-created-connection.ds';
import { CreatedConnectionDs } from '../application/data-structures/created-connection.ds';
import { DeleteConnectionDs } from '../application/data-structures/delete-connection.ds';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IDeleteConnection } from './use-cases.interfaces';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';

@Injectable()
export class DeleteConnectionUseCase
  extends AbstractUseCase<DeleteConnectionDs, CreatedConnectionDs>
  implements IDeleteConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteConnectionDs): Promise<CreatedConnectionDs> {
    const connectionToDelete = await this._dbContext.connectionRepository.findAndDecryptConnection(
      inputData.connectionId,
      inputData.masterPwd,
    );
    if (!connectionToDelete) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this._dbContext.connectionRepository.removeConnection(connectionToDelete);
    return buildCreatedConnectionDs(result, null, inputData.masterPwd);
  }
}
