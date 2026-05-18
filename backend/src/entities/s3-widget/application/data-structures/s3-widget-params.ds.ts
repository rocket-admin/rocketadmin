import { BucketProviderEnum } from './bucket-provider.enum.js';

export interface BucketWidgetParams {
	provider?: BucketProviderEnum;
	bucket: string;
	prefix?: string;
	region?: string;
	account_id?: string;
	access_key_id: string;
	access_key: string;
	type?: 'file' | 'image';
}
