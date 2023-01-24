import {
  Body,
  ClassSerializerInterceptor,
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
import { MasterPassword, QueryTableName, QueryUuid, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { FoundTableSettingsDs } from '../table-settings/application/data-structures/found-table-settings.ds.js';
import { CreateCustomFieldsDs } from './application/data-structures/create-custom-fields.ds.js';
import { DeleteCustomFieldsDs } from './application/data-structures/delete-custom-fields.ds.js';
import { FoundCustomFieldsDs } from './application/data-structures/found-custom-fields.ds.js';
import { GetCustomFieldsDs } from './application/data-structures/get-custom-fields.ds.js';
import { UpdateCustomFieldsDs } from './application/data-structures/update-custom-fields.ds.js';
import {
  ICreateCustomFields,
  IDeleteCustomField,
  IGetCustomFields,
  IUpdateCustomFields,
} from './use-cases/custom-field-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
export class CustomFieldController {
  constructor(
    @Inject(UseCaseType.GET_CUSTOM_FIELDS)
    private readonly getCustomFieldsUseCase: IGetCustomFields,
    @Inject(UseCaseType.CREATE_CUSTOM_FIELDS)
    private readonly createCustomFieldsUseCase: ICreateCustomFields,
    @Inject(UseCaseType.UPDATE_CUSTOM_FIELDS)
    private readonly updateCustomFieldsUseCase: IUpdateCustomFields,
    @Inject(UseCaseType.DELETE_CUSTOM_FIELD)
    private readonly deleteCustomFieldUseCase: IDeleteCustomField,
  ) {}

  @UseGuards(ConnectionReadGuard)
  @Get('/fields/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @QueryTableName() tableName: string,
    @SlugUuid() connectionId: string,
  ): Promise<Array<FoundCustomFieldsDs>> {
    const inputData: GetCustomFieldsDs = {
      connectionId: connectionId,
      tableName: tableName,
    };
    return await this.getCustomFieldsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @UseGuards(ConnectionEditGuard)
  @Post('/field/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async createCustomField(
    @QueryTableName() tableName: string,
    @Body('type') type: string,
    @Body('template_string') template_string: string,
    @Body('text') text: string,
    @SlugUuid() connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundTableSettingsDs> {
    const createFieldDto = {
      type: type,
      text: text,
      template_string: template_string,
    };
    const inputData: CreateCustomFieldsDs = {
      connectionId: connectionId,
      createFieldDto: createFieldDto,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
    };
    return await this.createCustomFieldsUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @UseGuards(ConnectionEditGuard)
  @Put('/field/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async updateCustomField(
    @QueryTableName() tableName: string,
    @Body('type') type: string,
    @Body('template_string') template_string: string,
    @Body('text') text: string,
    @Body('id') id: string,
    @SlugUuid() connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundCustomFieldsDs> {
    const updateFieldDto = {
      id: id,
      type: type,
      text: text,
      template_string: template_string,
    };
    if (!updateFieldDto.id) {
      throw new HttpException(
        {
          message: Messages.CUSTOM_FIELD_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: UpdateCustomFieldsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      updateFieldDto: updateFieldDto,
      userId: userId,
    };
    return await this.updateCustomFieldsUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @UseGuards(ConnectionEditGuard)
  @Delete('/field/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async deleteCustomField(
    @QueryTableName() tableName: string,
    @QueryUuid('id') fieldId: string,
    @SlugUuid() connectionId: string,
  ): Promise<FoundTableSettingsDs> {
    if (!fieldId) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteCustomFieldsDs = {
      connectionId: connectionId,
      fieldId: fieldId,
      tableName: tableName,
    };
    return await this.deleteCustomFieldUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
