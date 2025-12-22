import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { S3FileUrlResponseDs, S3UploadUrlResponseDs } from './application/data-structures/s3-operation.ds.js';
import { IGetS3FileUrl, IGetS3UploadUrl } from './use-cases/s3-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('S3 Widget')
@Injectable()
export class S3WidgetController {
  constructor(
    @Inject(UseCaseType.GET_S3_FILE_URL)
    private readonly getS3FileUrlUseCase: IGetS3FileUrl,
    @Inject(UseCaseType.GET_S3_UPLOAD_URL)
    private readonly getS3UploadUrlUseCase: IGetS3UploadUrl,
  ) {}

  @UseGuards(ConnectionReadGuard)
  @ApiOperation({ summary: 'Get pre-signed URL for S3 file download' })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed URL generated successfully.',
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiQuery({ name: 'fieldName', required: true })
  @ApiQuery({ name: 'fileKey', required: true })
  @Get('/s3/file/:connectionId')
  async getFileUrl(
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @Query('fieldName') fieldName: string,
    @Query('fileKey') fileKey: string,
  ): Promise<S3FileUrlResponseDs> {
    if (!connectionId) {
      throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
    }
    if (!fieldName) {
      throw new HttpException({ message: 'Field name is required' }, HttpStatus.BAD_REQUEST);
    }
    if (!fileKey) {
      throw new HttpException({ message: 'File key is required' }, HttpStatus.BAD_REQUEST);
    }

    return await this.getS3FileUrlUseCase.execute(
      {
        connectionId,
        tableName,
        fieldName,
        fileKey,
        userId,
        masterPwd,
      },
      InTransactionEnum.OFF,
    );
  }

  @UseGuards(ConnectionEditGuard)
  @ApiOperation({ summary: 'Get pre-signed URL for S3 file upload' })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed upload URL generated successfully.',
  })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiQuery({ name: 'fieldName', required: true })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Name of the file to upload' },
        contentType: { type: 'string', description: 'MIME type of the file' },
      },
      required: ['filename', 'contentType'],
    },
  })
  @Post('/s3/upload-url/:connectionId')
  async getUploadUrl(
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @Query('fieldName') fieldName: string,
    @Body() body: { filename: string; contentType: string },
  ): Promise<S3UploadUrlResponseDs> {
    if (!connectionId) {
      throw new HttpException({ message: Messages.CONNECTION_ID_MISSING }, HttpStatus.BAD_REQUEST);
    }
    if (!fieldName) {
      throw new HttpException({ message: 'Field name is required' }, HttpStatus.BAD_REQUEST);
    }
    if (!body.filename) {
      throw new HttpException({ message: 'Filename is required' }, HttpStatus.BAD_REQUEST);
    }
    if (!body.contentType) {
      throw new HttpException({ message: 'Content type is required' }, HttpStatus.BAD_REQUEST);
    }

    return await this.getS3UploadUrlUseCase.execute(
      {
        connectionId,
        tableName,
        fieldName,
        userId,
        masterPwd,
        filename: body.filename,
        contentType: body.contentType,
      },
      InTransactionEnum.OFF,
    );
  }
}
