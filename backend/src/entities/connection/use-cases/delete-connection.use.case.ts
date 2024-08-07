import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreatedConnectionDTO } from '../application/dto/created-connection.dto.js';
import { DeleteConnectionDs } from '../application/data-structures/delete-connection.ds.js';
import { buildCreatedConnectionDs } from '../utils/build-created-connection.ds.js';
import { IDeleteConnection } from './use-cases.interfaces.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteConnectionUseCase
  extends AbstractUseCase<DeleteConnectionDs, CreatedConnectionDTO>
  implements IDeleteConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteConnectionDs): Promise<CreatedConnectionDTO> {
    const connectionToDelete = await this._dbContext.connectionRepository.findAndDecryptConnection(
      inputData.connectionId,
      inputData.masterPwd,
    );
    if (!connectionToDelete) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }
    const userNonTestConnections = await this._dbContext.connectionRepository.findAllUserNonTestsConnections(
      inputData.cognitoUserName,
    );
    if (userNonTestConnections.length === 0) {
      throw new BadRequestException(Messages.DONT_HAVE_NON_TEST_CONNECTIONS);
    }
    const result = await this._dbContext.connectionRepository.removeConnection(connectionToDelete);
    return buildCreatedConnectionDs(result, null, inputData.masterPwd);
  }
}
