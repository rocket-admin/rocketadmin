import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { BucketProviderEnum } from './application/data-structures/bucket-provider.enum.js';

export interface BucketClientConfig {
	accessKeyId: string;
	secretAccessKey: string;
	provider?: BucketProviderEnum;
	region?: string;
	accountId?: string;
}

@Injectable()
export class S3HelperService {
	public createS3Client(config: BucketClientConfig): S3Client {
		const provider = config.provider || BucketProviderEnum.AWS;
		const region = this._resolveRegion(provider, config.region);
		const endpoint = this._resolveEndpoint(provider, region, config.accountId);

		return new S3Client({
			region,
			endpoint,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			},
		});
	}

	public async getSignedGetUrl(
		client: S3Client,
		bucket: string,
		key: string,
		expiresIn: number = 3600,
	): Promise<string> {
		const command = new GetObjectCommand({ Bucket: bucket, Key: key });
		return getSignedUrl(client, command, { expiresIn });
	}

	public async getSignedPutUrl(
		client: S3Client,
		bucket: string,
		key: string,
		contentType: string,
		expiresIn: number = 3600,
	): Promise<string> {
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			ContentType: contentType,
		});
		return getSignedUrl(client, command, { expiresIn });
	}

	public generateFileKey(prefix: string | undefined, filename: string): string {
		const id = nanoid(12);
		const extension = this._extractFileExtension(filename);
		const key = extension ? `${id}${extension}` : id;

		if (prefix) {
			const normalizedPrefix = prefix.replace(/\/$/, '');
			return `${normalizedPrefix}/${key}`;
		}
		return key;
	}

	private _resolveRegion(provider: BucketProviderEnum, region: string | undefined): string {
		if (region) {
			return region;
		}
		if (provider === BucketProviderEnum.CloudflareR2) {
			return 'auto';
		}
		return 'us-east-1';
	}

	private _resolveEndpoint(
		provider: BucketProviderEnum,
		region: string,
		accountId: string | undefined,
	): string | undefined {
		switch (provider) {
			case BucketProviderEnum.AWS:
				return undefined;
			case BucketProviderEnum.DigitalOceanSpaces:
				return `https://${region}.digitaloceanspaces.com`;
			case BucketProviderEnum.BackblazeB2:
				return `https://s3.${region}.backblazeb2.com`;
			case BucketProviderEnum.Wasabi:
				return `https://s3.${region}.wasabisys.com`;
			case BucketProviderEnum.CloudflareR2:
				if (!accountId) {
					throw new HttpException(
						{ message: 'Cloudflare R2 requires account_id in widget params' },
						HttpStatus.BAD_REQUEST,
					);
				}
				return `https://${accountId}.r2.cloudflarestorage.com`;
			default:
				return undefined;
		}
	}

	private _extractFileExtension(filename: string): string {
		const lastDotIndex = filename.lastIndexOf('.');
		if (lastDotIndex === -1 || lastDotIndex === 0) {
			return '';
		}
		const extension = filename.slice(lastDotIndex).toLowerCase();
		if (/^\.[a-z0-9]+$/i.test(extension)) {
			return extension;
		}
		return '';
	}
}
