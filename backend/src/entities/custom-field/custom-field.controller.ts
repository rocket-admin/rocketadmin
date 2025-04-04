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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { CreateCustomFieldDto, UpdateCustomFieldDTO } from './dto/create-custom-field.dto.js';
import {
  ICreateCustomFields,
  IDeleteCustomField,
  IGetCustomFields,
  IUpdateCustomFields,
} from './use-cases/custom-field-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Custom fields')
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

  @ApiOperation({ summary: 'Find custom fields' })
  @ApiResponse({
    status: 200,
    description: 'Custom fields found.',
    type: Array<FoundCustomFieldsDs>,
  })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @UseGuards(ConnectionReadGuard)
  @Get('/fields/:connectionId')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @QueryTableName() tableName: string,
    @SlugUuid('connectionId') connectionId: string,
  ): Promise<Array<FoundCustomFieldsDs>> {
    const inputData: GetCustomFieldsDs = {
      connectionId: connectionId,
      tableName: tableName,
    };
    return await this.getCustomFieldsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Create new custom field' })
  @ApiBody({ type: CreateCustomFieldDto })
  @ApiResponse({
    status: 201,
    description: 'Create custom field.',
    type: FoundTableSettingsDs,
  })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @UseGuards(ConnectionEditGuard)
  @Post('/field/:connectionId')
  @UseInterceptors(ClassSerializerInterceptor)
  async createCustomField(
    @QueryTableName() tableName: string,
    @Body() customFieldData: CreateCustomFieldDto,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundTableSettingsDs> {
    const { type, template_string, text } = customFieldData;
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

  @ApiOperation({ summary: 'Update custom field' })
  @ApiBody({ type: UpdateCustomFieldDTO })
  @ApiResponse({
    status: 200,
    description: 'Update custom field.',
    type: FoundCustomFieldsDs,
  })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @UseGuards(ConnectionEditGuard)
  @Put('/field/:connectionId')
  @UseInterceptors(ClassSerializerInterceptor)
  async updateCustomField(
    @QueryTableName() tableName: string,
    @Body() customFieldData: UpdateCustomFieldDTO,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundCustomFieldsDs> {
    const { id, type, template_string, text } = customFieldData;
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

  @ApiOperation({ summary: 'Delete custom field' })
  @ApiResponse({
    status: 200,
    description: 'Delete custom field.',
    type: FoundTableSettingsDs,
  })
  @ApiQuery({ name: 'tableName', required: true, type: String })
  @ApiQuery({ name: 'id', required: true, type: String })
  @UseGuards(ConnectionEditGuard)
  @Delete('/field/:connectionId')
  @UseInterceptors(ClassSerializerInterceptor)
  async deleteCustomField(
    @QueryTableName() tableName: string,
    @QueryUuid('id') fieldId: string,
    @SlugUuid('connectionId') connectionId: string,
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
