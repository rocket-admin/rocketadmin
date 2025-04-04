import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { CompanyLogoEntity } from './company-logo.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyInfoEntity, CompanyLogoEntity])],
  providers: [],
  exports: [],
})
export class CompanyLogoModule {}
