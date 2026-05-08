import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import {
	BucketFileUrlResponseDs,
	BucketUploadUrlResponseDs,
	GetBucketFileUrlDs,
	GetBucketUploadUrlDs,
} from '../application/data-structures/s3-operation.ds.js';

export interface IGetS3FileUrl {
	execute(inputData: GetBucketFileUrlDs, inTransaction: InTransactionEnum): Promise<BucketFileUrlResponseDs>;
}

export interface IGetS3UploadUrl {
	execute(inputData: GetBucketUploadUrlDs, inTransaction: InTransactionEnum): Promise<BucketUploadUrlResponseDs>;
}
