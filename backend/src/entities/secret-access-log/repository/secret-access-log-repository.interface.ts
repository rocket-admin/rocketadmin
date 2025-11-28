import { SecretAccessLogEntity, SecretActionEnum } from '../secret-access-log.entity.js';

export interface ISecretAccessLogRepository {
  createAccessLog(
    secretId: string,
    userId: string,
    action: SecretActionEnum,
    success?: boolean,
    errorMessage?: string,
  ): Promise<SecretAccessLogEntity>;
  findLogsForSecret(
    secretId: string,
    options: { page: number; limit: number },
  ): Promise<[SecretAccessLogEntity[], number]>;
}
