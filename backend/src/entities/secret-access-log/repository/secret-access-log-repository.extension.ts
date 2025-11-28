import { SecretAccessLogEntity, SecretActionEnum } from '../secret-access-log.entity.js';
import { ISecretAccessLogRepository } from './secret-access-log-repository.interface.js';

export const secretAccessLogRepositoryExtension: ISecretAccessLogRepository = {
  async createAccessLog(
    secretId: string,
    userId: string,
    action: SecretActionEnum,
    success: boolean = true,
    errorMessage?: string,
  ): Promise<SecretAccessLogEntity> {
    const self = this as any;
    const log = self.create({
      secretId,
      userId,
      action,
      success,
      errorMessage,
      accessedAt: new Date(),
    });
    return self.save(log);
  },

  async findLogsForSecret(
    secretId: string,
    options: { page: number; limit: number },
  ): Promise<[SecretAccessLogEntity[], number]> {
    const self = this as any;
    return self.findAndCount({
      where: {
        secretId,
      },
      relations: ['user'],
      order: {
        accessedAt: 'DESC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
  },
};
