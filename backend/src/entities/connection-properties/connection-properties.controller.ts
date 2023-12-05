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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateConnectionPropertiesDto } from './dto/create-connection-properties.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('connection properties')
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

  @ApiOperation({ summary: 'Get connection properties' })
  @ApiResponse({
    status: 200,
    description: 'Receive connection properties.',
    type: FoundConnectionPropertiesDs,
  })
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

  @ApiOperation({ summary: 'Create connection properties' })
  @ApiBody({
    type: CreateConnectionPropertiesDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Create connection properties.',
    type: FoundConnectionPropertiesDs,
  })
  @UseGuards(ConnectionEditGuard)
  @Post('/connection/properties/:slug')
  async createConnectionProperties(
    @Body() connectionPropertiesData: CreateConnectionPropertiesDto,
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
      hidden_tables: connectionPropertiesData.hidden_tables,
      userId: userId,
      logo_url: connectionPropertiesData.logo_url,
      primary_color: connectionPropertiesData.primary_color,
      secondary_color: connectionPropertiesData.secondary_color,
      hostname: connectionPropertiesData.hostname,
      company_name: connectionPropertiesData.company_name,
      tables_audit: connectionPropertiesData.tables_audit,
    };

    return await this.createConnectionPropertiesUseCase.execute(createConnectionPropertiesDs, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Update connection properties' })
  @ApiBody({
    type: CreateConnectionPropertiesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Update connection properties.',
    type: FoundConnectionPropertiesDs,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/properties/:slug')
  async updateConnectionProperties(
    @Body() connectionPropertiesData: CreateConnectionPropertiesDto,
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
      hidden_tables: connectionPropertiesData.hidden_tables,
      userId: userId,
      logo_url: connectionPropertiesData.logo_url,
      primary_color: connectionPropertiesData.primary_color,
      secondary_color: connectionPropertiesData.secondary_color,
      company_name: connectionPropertiesData.company_name,
      hostname: connectionPropertiesData.hostname,
      tables_audit: connectionPropertiesData.tables_audit,
    };

    return await this.updateConnectionPropertiesUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Delete connection properties' })
  @ApiResponse({
    status: 200,
    description: 'Delete connection properties.',
    type: FoundConnectionPropertiesDs,
  })
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
