import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import JSON5 from 'json5';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { WidgetTypeEnum } from '../../../enums/widget-type.enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { BucketFileUrlResponseDs, GetBucketFileUrlDs } from '../application/data-structures/s3-operation.ds.js';
import { BucketWidgetParams } from '../application/data-structures/s3-widget-params.ds.js';
import { S3HelperService } from '../s3-helper.service.js';
import { IGetS3FileUrl } from './s3-use-cases.interface.js';

@Injectable()
export class GetS3FileUrlUseCase
	extends AbstractUseCase<GetBucketFileUrlDs, BucketFileUrlResponseDs>
	implements IGetS3FileUrl
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly s3Helper: S3HelperService,
	) {
		super();
	}

	protected async implementation(inputData: GetBucketFileUrlDs): Promise<BucketFileUrlResponseDs> {
		const { connectionId, tableName, fieldName, rowPrimaryKey, userId, masterPwd } = inputData;

		const user = await this._dbContext.userRepository.findOneUserByIdWithCompany(userId);
		if (!user || !user.company) {
			throw new HttpException({ message: Messages.USER_NOT_FOUND_OR_NOT_IN_COMPANY }, HttpStatus.NOT_FOUND);
		}

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		if (!connection) {
			throw new HttpException({ message: Messages.CONNECTION_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}

		const foundTableWidgets = await this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName);
		const widget = foundTableWidgets.find((w) => w.field_name === fieldName);

		if (!widget || widget.widget_type !== WidgetTypeEnum.S3) {
			throw new HttpException({ message: 'S3 widget not configured for this field' }, HttpStatus.BAD_REQUEST);
		}

		const params: BucketWidgetParams =
			typeof widget.widget_params === 'string' ? JSON5.parse(widget.widget_params) : widget.widget_params;

		// Fetch the row from database to get the actual file key
		const dao = getDataAccessObject(connection);
		let userEmail: string;
		if (isConnectionTypeAgent(connection.type)) {
			userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
		}

		const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettingsPure(connectionId, tableName);
		const personalTableSettings = await this._dbContext.personalTableSettingsRepository.findUserTableSettings(
			userId,
			connectionId,
			tableName,
		);
		const rowData = await dao.getRowByPrimaryKey(
			tableName,
			rowPrimaryKey,
			buildDAOsTableSettingsDs(tableSettings, personalTableSettings),
			userEmail,
		);

		if (!rowData) {
			throw new HttpException({ message: Messages.ROW_PRIMARY_KEY_NOT_FOUND }, HttpStatus.NOT_FOUND);
		}

		const fileKey = rowData[fieldName] as string;
		if (!fileKey) {
			throw new HttpException({ message: 'File key not found in row' }, HttpStatus.NOT_FOUND);
		}

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

		const expiresIn = 3600;
		const url = await this.s3Helper.getSignedGetUrl(client, params.bucket, fileKey, expiresIn);

		return { url, key: fileKey, expiresIn };
	}
}
