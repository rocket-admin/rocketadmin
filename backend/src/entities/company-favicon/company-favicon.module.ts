import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { CompanyFaviconEntity } from './company-favicon.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyInfoEntity, CompanyFaviconEntity])],
  providers: [],
  exports: [],
})
export class CompanyFaviconModule {}
