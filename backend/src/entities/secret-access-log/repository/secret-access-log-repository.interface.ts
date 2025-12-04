import { Repository } from 'typeorm';
import { SecretAccessLogEntity, SecretActionEnum } from '../secret-access-log.entity.js';

export interface ISecretAccessLogRepository {
  createAccessLog(
    this: Repository<SecretAccessLogEntity>,
    secretId: string,
    userId: string,
    action: SecretActionEnum,
    success?: boolean,
    errorMessage?: string,
  ): Promise<SecretAccessLogEntity>;
  findLogsForSecret(
    this: Repository<SecretAccessLogEntity>,
    secretId: string,
    options: { page: number; limit: number },
  ): Promise<[SecretAccessLogEntity[], number]>;
}
