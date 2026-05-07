import { BucketProviderEnum } from './bucket-provider.enum.js';

export interface BucketWidgetParams {
	provider?: BucketProviderEnum;
	bucket: string;
	prefix?: string;
	region?: string;
	account_id?: string;
	access_key_id_secret_name: string;
	secret_access_key_secret_name: string;
	type?: 'file' | 'image';
}
