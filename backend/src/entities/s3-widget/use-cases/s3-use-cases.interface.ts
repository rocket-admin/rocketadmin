import { InTransactionEnum } from '../../../enums/index.js';
import {
	S3FileUrlResponseDs,
	S3GetFileUrlDs,
	S3GetUploadUrlDs,
	S3UploadUrlResponseDs,
} from '../application/data-structures/s3-operation.ds.js';

export interface IGetS3FileUrl {
	execute(inputData: S3GetFileUrlDs, inTransaction: InTransactionEnum): Promise<S3FileUrlResponseDs>;
}

export interface IGetS3UploadUrl {
	execute(inputData: S3GetUploadUrlDs, inTransaction: InTransactionEnum): Promise<S3UploadUrlResponseDs>;
}
