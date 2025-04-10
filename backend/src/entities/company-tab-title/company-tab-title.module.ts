import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { CompanyTabTitleEntity } from './company-tab-title.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyInfoEntity, CompanyTabTitleEntity])],
  providers: [],
  exports: [],
})
export class CompanyTabTitleModule {}
