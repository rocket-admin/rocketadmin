import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from '../../authorization/index.js';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { S3WidgetController } from './s3-widget.controller.js';
import { S3HelperService } from './s3-helper.service.js';
import { GetS3FileUrlUseCase } from './use-cases/get-s3-file-url.use.case.js';
import { GetS3UploadUrlUseCase } from './use-cases/get-s3-upload-url.use.case.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LogOutEntity])],
  providers: [
    S3HelperService,
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.GET_S3_FILE_URL,
      useClass: GetS3FileUrlUseCase,
    },
    {
      provide: UseCaseType.GET_S3_UPLOAD_URL,
      useClass: GetS3UploadUrlUseCase,
    },
  ],
  controllers: [S3WidgetController],
  exports: [S3HelperService],
})
export class S3WidgetModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: '/s3/file/:connectionId', method: RequestMethod.GET },
        { path: '/s3/upload-url/:connectionId', method: RequestMethod.POST },
      );
  }
}
