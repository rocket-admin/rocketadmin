import { Body, Controller, Get, Inject, Injectable, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { ConnectionReadGuard } from '../../guards/connection-read.guard.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CreateOrUpdateTableCategoriesDS } from './data-sctructures/create-or-update-table-categories.ds.js';
import { CreateTableCategoryDto } from './dto/create-table-category.dto.js';
import { FoundTableCategoryRo } from './dto/found-table-category.ro.js';
import { ICreateTableCategories, IFindTableCategories } from './use-cases/table-categories-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller('table-categories')
@ApiBearerAuth()
@ApiTags('Table categories')
@Injectable()
export class TableCategoriesController {
  constructor(
    @Inject(UseCaseType.CREATE_UPDATE_TABLE_CATEGORIES)
    private readonly createTableCategoriesUseCase: ICreateTableCategories,
    @Inject(UseCaseType.FIND_TABLE_CATEGORIES)
    private readonly findTableCategoriesUseCase: IFindTableCategories,
  ) {}

  @ApiOperation({ summary: 'Add new table categories' })
  @ApiBody({ type: CreateTableCategoryDto, isArray: true })
  @ApiResponse({
    status: 200,
    description: 'Table categories created.',
    type: FoundTableCategoryRo,
    isArray: true,
  })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionEditGuard)
  @Put('/:connectionId')
  async createTableCategories(
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @Body() requestBody: CreateTableCategoryDto[],
  ): Promise<Array<FoundTableCategoryRo>> {
    const inputData: CreateOrUpdateTableCategoriesDS = {
      connectionId,
      master_password: masterPwd,
      table_categories: requestBody,
    };
    return await this.createTableCategoriesUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Find table categories' })
  @ApiResponse({
    status: 200,
    description: 'Table categories found.',
    type: FoundTableCategoryRo,
    isArray: true,
  })
  @ApiParam({ name: 'connectionId', required: true })
  @UseGuards(ConnectionReadGuard)
  @Get('/:connectionId')
  async findTableCategories(@SlugUuid('connectionId') connectionId: string): Promise<Array<FoundTableCategoryRo>> {
    return await this.findTableCategoriesUseCase.execute(connectionId);
  }
}
