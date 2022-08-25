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
  Query,
  Scope,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../exceptions/text/messages';
import { SentryInterceptor } from '../../interceptors';
import { UpdateCustomFieldDto } from './dto/update-custom-field-dto';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards';
import { UseCaseType } from '../../common/data-injection.tokens';
import {
  ICreateCustomFields,
  IDeleteCustomField,
  IGetCustomFields,
  IUpdateCustomFields,
} from './use-cases/custom-field-use-cases.interface';
import { GetCustomFieldsDs } from './application/data-structures/get-custom-fields.ds';
import { CreateCustomFieldsDs } from './application/data-structures/create-custom-fields.ds';
import { UpdateCustomFieldsDs } from './application/data-structures/update-custom-fields.ds';
import { DeleteCustomFieldsDs } from './application/data-structures/delete-custom-fields.ds';
import { FoundCustomFieldsDs } from './application/data-structures/found-custom-fields.ds';
import { FoundTableSettingsDs } from '../table-settings/application/data-structures/found-table-settings.ds';
import { MasterPassword, QueryUuid, SlugUuid, UserId } from '../../decorators';

@ApiBearerAuth()
@ApiTags('custom_fields')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable({ scope: Scope.REQUEST })
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

  @ApiOperation({ summary: 'Get all table custom fields' })
  @ApiResponse({ status: 200, description: 'Return all table settings.' })
  @UseGuards(ConnectionReadGuard)
  @Get('/fields/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @Query('tableName') tableName: string,
    @SlugUuid() connectionId: string,
  ): Promise<Array<FoundCustomFieldsDs>> {
    const inputData: GetCustomFieldsDs = {
      connectionId: connectionId,
      tableName: tableName,
    };
    return await this.getCustomFieldsUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Create new custom field' })
  @ApiResponse({
    status: 201,
    description: 'Return table settings with created custom field.',
  })
  @ApiBody({ type: CreateCustomFieldDto })
  @UseGuards(ConnectionEditGuard)
  @Post('/field/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async createCustomField(
    @Query('tableName') tableName: string,
    @Body('type') type: string,
    @Body('template_string') template_string: string,
    @Body('text') text: string,
    @SlugUuid() connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundTableSettingsDs> {
    if (!tableName || tableName.length === 0) {
      throw new HttpException(
        {
          message: Messages.TABLE_NAME_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
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
    return await this.createCustomFieldsUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Update custom field' })
  @ApiResponse({ status: 201, description: 'Return updated custom field.' })
  @ApiBody({ type: UpdateCustomFieldDto })
  @UseGuards(ConnectionEditGuard)
  @Put('/field/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async updateCustomField(
    @Query('tableName') tableName: string,
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
    if (!tableName || tableName.length === 0) {
      throw new HttpException(
        {
          message: Messages.TABLE_NAME_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
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
    return await this.updateCustomFieldsUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Delete custom field' })
  @ApiResponse({
    status: 200,
    description: 'Return table settings without deleted custom field.',
  })
  @UseGuards(ConnectionEditGuard)
  @Delete('/field/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async deleteCustomField(
    @Query('tableName') tableName: string,
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
    if (!tableName || tableName.length === 0) {
      throw new HttpException(
        {
          message: Messages.TABLE_NAME_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteCustomFieldsDs = {
      connectionId: connectionId,
      fieldId: fieldId,
      tableName: tableName,
    };
    return await this.deleteCustomFieldUseCase.execute(inputData);
  }
}
