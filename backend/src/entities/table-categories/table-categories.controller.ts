import { Body, Controller, Inject, Injectable, ParseArrayPipe, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { ICreateTableCategories, IFindTableCategories } from './use-cases/table-categories-use-cases.interface.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { FoundTableCategoryRo } from './dto/found-table-category.ro.js';
import { CreateTableCategoryDto } from './dto/create-table-category.dto.js';
import { CreateOrUpdateTableCategoriesDS } from './data-sctructures/create-or-update-table-categories.ds.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';

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
  @Put('/:connectionId')
  @UseGuards(ConnectionEditGuard)
  async createTableCategories(
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @Body(new ParseArrayPipe({ items: CreateTableCategoryDto })) requestBody: CreateTableCategoryDto[],
  ): Promise<Array<FoundTableCategoryRo>> {
    const inputData: CreateOrUpdateTableCategoriesDS = {
      connectionId,
      master_password: masterPwd,
      table_categories: requestBody,
    };
    return this.createTableCategoriesUseCase.execute(inputData);
  }
}
