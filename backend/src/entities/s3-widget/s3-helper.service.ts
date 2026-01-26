import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

@Injectable()
export class S3HelperService {
	public createS3Client(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1'): S3Client {
		return new S3Client({
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
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
