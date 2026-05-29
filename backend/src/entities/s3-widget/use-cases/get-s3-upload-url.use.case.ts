import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import JSON5 from 'json5';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { WidgetTypeEnum } from '../../../enums/widget-type.enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { BucketUploadUrlResponseDs, GetBucketUploadUrlDs } from '../application/data-structures/s3-operation.ds.js';
import { BucketWidgetParams } from '../application/data-structures/s3-widget-params.ds.js';
import { S3HelperService } from '../s3-helper.service.js';
import { IGetS3UploadUrl } from './s3-use-cases.interface.js';

@Injectable()
export class GetS3UploadUrlUseCase
	extends AbstractUseCase<GetBucketUploadUrlDs, BucketUploadUrlResponseDs>
	implements IGetS3UploadUrl
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly s3Helper: S3HelperService,
	) {
		super();
	}

	protected async implementation(inputData: GetBucketUploadUrlDs): Promise<BucketUploadUrlResponseDs> {
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

		const params: BucketWidgetParams =
			typeof widget.widget_params === 'string' ? JSON5.parse(widget.widget_params) : widget.widget_params;

		const accessKeySecret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(
			params.access_key_id,
			user.company.id,
		);

		const secretKeySecret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(
			params.access_key,
			user.company.id,
		);

		if (!accessKeySecret || !secretKeySecret) {
			throw new HttpException({ message: 'Bucket credentials secrets not found' }, HttpStatus.NOT_FOUND);
		}

		let accessKeyId = Encryptor.decryptData(accessKeySecret.encryptedValue);
		let secretAccessKey = Encryptor.decryptData(secretKeySecret.encryptedValue);

		if (accessKeySecret.masterEncryption && masterPwd) {
			accessKeyId = Encryptor.decryptDataMasterPwd(accessKeyId, masterPwd);
		}
		if (secretKeySecret.masterEncryption && masterPwd) {
			secretAccessKey = Encryptor.decryptDataMasterPwd(secretAccessKey, masterPwd);
		}

		const client = this.s3Helper.createS3Client({
			accessKeyId,
			secretAccessKey,
			provider: params.provider,
			region: params.region,
			accountId: params.account_id,
		});

		const key = this.s3Helper.generateFileKey(params.prefix, filename);
		const expiresIn = 3600;
		const uploadUrl = await this.s3Helper.getSignedPutUrl(client, params.bucket, key, contentType, expiresIn);
		const previewUrl = await this.s3Helper.getSignedGetUrl(client, params.bucket, key, expiresIn);

		return { uploadUrl, key, expiresIn, previewUrl };
	}
}
