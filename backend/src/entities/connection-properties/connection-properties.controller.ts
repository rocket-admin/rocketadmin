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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CreateConnectionPropertiesDs } from './application/data-structures/create-connection-properties.ds.js';
import { FoundConnectionPropertiesDs } from './application/data-structures/found-connection-properties.ds.js';
import { IConnectionPropertiesRO } from './connection-properties.interface.js';
import {
  ICreateConnectionProperties,
  IDeleteConnectionProperties,
  IFindConnectionProperties,
  IUpdateConnectionProperties,
} from './use-cases/connection-properties-use.cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
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

  @UseGuards(ConnectionReadGuard)
  @Get('/connection/properties/:slug')
  async findConnectionProperties(@SlugUuid() connectionId: string): Promise<FoundConnectionPropertiesDs | null> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.findConnectionPropertiesUseCase.execute(connectionId, InTransactionEnum.OFF);
  }

  @UseGuards(ConnectionEditGuard)
  @Post('/connection/properties/:slug')
  async createConnectionProperties(
    @Body('hidden_tables') hidden_tables: Array<string>,
    @Body('logo_url') logo_url: string,
    @Body('primary_color') primary_color: string,
    @Body('secondary_color') secondary_color: string,
    @Body('hostname') hostname: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
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
      logo_url: logo_url,
      primary_color: primary_color,
      secondary_color: secondary_color,
      hostname: hostname,
    };

    return await this.createConnectionPropertiesUseCase.execute(createConnectionPropertiesDs, InTransactionEnum.ON);
  }

  @UseGuards(ConnectionEditGuard)
  @Put('/connection/properties/:slug')
  async updateConnectionProperties(
    @Body('hidden_tables') hidden_tables: Array<string>,
    @Body('logo_url') logo_url: string,
    @Body('primary_color') primary_color: string,
    @Body('secondary_color') secondary_color: string,
    @Body('hostname') hostname: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
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
      logo_url: logo_url,
      primary_color: primary_color,
      secondary_color: secondary_color,
      hostname: hostname,
    };

    return await this.updateConnectionPropertiesUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @UseGuards(ConnectionEditGuard)
  @Delete('/connection/properties/:slug')
  async deleteConnectionProperties(@SlugUuid() connectionId: string): Promise<IConnectionPropertiesRO> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.deleteConnectionPropertiesUseCase.execute(connectionId, InTransactionEnum.ON);
  }
}
