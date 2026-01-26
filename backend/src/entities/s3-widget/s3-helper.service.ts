import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

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
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (prefix) {
      const normalizedPrefix = prefix.replace(/\/$/, '');
      return `${normalizedPrefix}/${timestamp}_${sanitizedFilename}`;
    }
    return `${timestamp}_${sanitizedFilename}`;
  }
}
