import { Controller, Get, Inject, Injectable, Res, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { InTransactionEnum } from '../../enums/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { IGetConversions } from './use-cases/get-conversions-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Conversion')
@Injectable()
export class ConversionController {
  constructor(
    @Inject(UseCaseType.GET_CONVERSIONS)
    private readonly getConversionsUseCase: IGetConversions,
  ) {}

  @Get('/conversions')
  async getConversions(@Res() res: Response): Promise<any> {
    const csvData = await this.getConversionsUseCase.execute(undefined, InTransactionEnum.OFF);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=conversions.csv');
    res.status(200).end(csvData);
    return;
  }
}
