import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Put,
  Req,
  Scope,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors';
import { IRequestWithCognitoInfo } from '../../authorization';
import { IConnectionPropertiesRO } from './connection-properties.interface';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../exceptions/text/messages';
import { CreateConnectionPropertiesDto } from './dto';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards';
import { UseCaseType } from '../../common/data-injection.tokens';
import {
  ICreateConnectionProperties,
  IDeleteConnectionProperties,
  IFindConnectionProperties,
  IUpdateConnectionProperties,
} from './use-cases/connection-properties-use.cases.interface';
import { FoundConnectionPropertiesDs } from './application/data-structures/found-connection-properties.ds';
import { CreateConnectionPropertiesDs } from './application/data-structures/create-connection-properties.ds';
import { ConnectionId, MasterPassword, UserId } from '../../decorators';

@ApiBearerAuth()
@ApiTags('connection properties')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable({ scope: Scope.REQUEST })
export class ConnectionPropertiesController {
  constructor(
    @Inject(UseCaseType.FIND_CONNECTION_PROPERTIES)
    private readonly findConnectionPropertiesUseCase: IFindConnectionProperties,
    @Inject(UseCaseType.CREATE_CONNECTION_PROPERTIES)
    private readonly createConnectionPropertiesUseCase: ICreateConnectionProperties,
    @Inject(UseCaseType.UPDATE_CONNECTION_PROPERTIES)
    private readonly updateConnectionPropertiesUseCase: IUpdateConnectionProperties,
    @Inject(UseCaseType.DELETE_CONNECTION_PROPERTIES)
    private readonly deleteConnectionPropertiesUseCase: IDeleteConnectionProperties,
  ) {}

  @ApiOperation({ summary: 'Get properties' })
  @ApiResponse({ status: 200, description: 'Return connection properties' })
  @UseGuards(ConnectionReadGuard)
  @Get('/connection/properties/:slug')
  async findConnectionProperties(
    @Req() request: IRequestWithCognitoInfo,
    @ConnectionId() connectionId: string,
  ): Promise<FoundConnectionPropertiesDs | null> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.findConnectionPropertiesUseCase.execute(connectionId);
  }

  @ApiOperation({ summary: 'Create properties' })
  @ApiResponse({ status: 201, description: 'Return created connection properties' })
  @ApiBody({ type: CreateConnectionPropertiesDto })
  @UseGuards(ConnectionEditGuard)
  @Post('/connection/properties/:slug')
  async createConnectionProperties(
    @Body('hidden_tables') hidden_tables: Array<string>,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @ConnectionId() connectionId: string,
  ): Promise<FoundConnectionPropertiesDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const createConnectionPropertiesDs: CreateConnectionPropertiesDs = {
      connectionId: connectionId,
      master_password: masterPwd,
      hidden_tables: hidden_tables,
      userId: userId,
    };

    return await this.createConnectionPropertiesUseCase.execute(createConnectionPropertiesDs);
  }

  @ApiOperation({ summary: 'Update properties' })
  @ApiResponse({ status: 201, description: 'Return updated connection properties' })
  @ApiBody({ type: CreateConnectionPropertiesDto })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/properties/:slug')
  async updateConnectionProperties(
    @Body('hidden_tables') hidden_tables: Array<string>,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @ConnectionId() connectionId: string,
  ): Promise<IConnectionPropertiesRO> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const inputData: CreateConnectionPropertiesDs = {
      connectionId: connectionId,
      master_password: masterPwd,
      hidden_tables: hidden_tables,
      userId: userId,
    };

    return await this.updateConnectionPropertiesUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Delete properties' })
  @ApiResponse({ status: 201, description: 'Delete connection properties' })
  @UseGuards(ConnectionEditGuard)
  @Delete('/connection/properties/:slug')
  async deleteConnectionProperties(@ConnectionId() connectionId: string): Promise<IConnectionPropertiesRO> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.deleteConnectionPropertiesUseCase.execute(connectionId);
  }
}
