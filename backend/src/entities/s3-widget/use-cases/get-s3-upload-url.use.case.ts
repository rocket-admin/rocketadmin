import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { S3GetUploadUrlDs, S3UploadUrlResponseDs } from '../application/data-structures/s3-operation.ds.js';
import { S3WidgetParams } from '../application/data-structures/s3-widget-params.ds.js';
import { S3HelperService } from '../s3-helper.service.js';
import { IGetS3UploadUrl } from './s3-use-cases.interface.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import JSON5 from 'json5';

@Injectable()
export class GetS3UploadUrlUseCase
  extends AbstractUseCase<S3GetUploadUrlDs, S3UploadUrlResponseDs>
  implements IGetS3UploadUrl
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly s3Helper: S3HelperService,
  ) {
    super();
  }

  protected async implementation(inputData: S3GetUploadUrlDs): Promise<S3UploadUrlResponseDs> {
    const { connectionId, tableName, fieldName, userId, masterPwd, filename, contentType } = inputData;

    const user = await this._dbContext.userRepository.findOneUserByIdWithCompany(userId);
    if (!user || !user.company) {
      throw new HttpException({ message: Messages.USER_NOT_FOUND_OR_NOT_IN_COMPANY }, HttpStatus.NOT_FOUND);
    }

    const foundTableWidgets = await this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName);
    const widget = foundTableWidgets.find((w) => w.field_name === fieldName);

    if (!widget || widget.widget_type !== WidgetTypeEnum.S3) {
      throw new HttpException({ message: 'S3 widget not configured for this field' }, HttpStatus.BAD_REQUEST);
    }

    const params: S3WidgetParams =
      typeof widget.widget_params === 'string' ? JSON5.parse(widget.widget_params) : widget.widget_params;

    const accessKeySecret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(
      params.aws_access_key_id_secret_name,
      user.company.id,
    );

    const secretKeySecret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(
      params.aws_secret_access_key_secret_name,
      user.company.id,
    );

    if (!accessKeySecret || !secretKeySecret) {
      throw new HttpException({ message: 'AWS credentials secrets not found' }, HttpStatus.NOT_FOUND);
    }

    let accessKeyId = Encryptor.decryptData(accessKeySecret.encryptedValue);
    let secretAccessKey = Encryptor.decryptData(secretKeySecret.encryptedValue);

    if (accessKeySecret.masterEncryption && masterPwd) {
      accessKeyId = Encryptor.decryptDataMasterPwd(accessKeyId, masterPwd);
    }
    if (secretKeySecret.masterEncryption && masterPwd) {
      secretAccessKey = Encryptor.decryptDataMasterPwd(secretAccessKey, masterPwd);
    }

    const client = this.s3Helper.createS3Client(accessKeyId, secretAccessKey, params.region || 'us-east-1');

    const key = this.s3Helper.generateFileKey(params.prefix, filename);
    const expiresIn = 3600;
    const uploadUrl = await this.s3Helper.getSignedPutUrl(client, params.bucket, key, contentType, expiresIn);

    return { uploadUrl, key, expiresIn };
  }
}
