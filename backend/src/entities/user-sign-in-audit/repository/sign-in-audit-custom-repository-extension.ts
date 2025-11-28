import { UserEntity } from '../../user/user.entity.js';
import { CreateSignInAuditRecordDs } from '../dto/create-sign-in-audit-record.ds.js';
import { SignInAuditEntity } from '../sign-in-audit.entity.js';
import {
  IFindSignInAuditLogsOptions,
  IFoundSignInAuditLogsResult,
  ISignInAuditRepository,
} from './sign-in-audit-repository.interface.js';

export const signInAuditCustomRepositoryExtension: ISignInAuditRepository = {
  async createSignInAuditRecord(data: CreateSignInAuditRecordDs): Promise<SignInAuditEntity> {
    const { email, userId, status, signInMethod, ipAddress, userAgent, failureReason } = data;

    const newRecord = new SignInAuditEntity();
    newRecord.email = email?.toLowerCase();
    newRecord.status = status;
    newRecord.signInMethod = signInMethod;
    newRecord.ipAddress = ipAddress || null;
    newRecord.userAgent = userAgent || null;
    newRecord.failureReason = failureReason || null;

    if (userId) {
      const userRepository = this.manager.getRepository(UserEntity);
      const user = await userRepository.findOne({ where: { id: userId } });
      if (user) {
        newRecord.user = user;
      }
    }

    return await this.save(newRecord);
  },

  async findSignInAuditLogs(options: IFindSignInAuditLogsOptions): Promise<IFoundSignInAuditLogsResult> {
    const { companyId, order, page, perPage, dateFrom, dateTo, searchedEmail, status, signInMethod, userId } = options;

    const qb = this.createQueryBuilder('signInAudit')
      .leftJoinAndSelect('signInAudit.user', 'user')
      .leftJoin('user.company', 'company')
      .where('company.id = :companyId', { companyId });

    if (userId) {
      qb.andWhere('user.id = :userId', { userId });
    }

    if (searchedEmail) {
      qb.andWhere('signInAudit.email = :email', { email: searchedEmail.toLowerCase() });
    }

    if (status) {
      qb.andWhere('signInAudit.status = :status', { status });
    }

    if (signInMethod) {
      qb.andWhere('signInAudit.signInMethod = :signInMethod', { signInMethod });
    }

    if (dateFrom && dateTo) {
      qb.andWhere('signInAudit.createdAt >= :dateFrom', { dateFrom });
      qb.andWhere('signInAudit.createdAt <= :dateTo', { dateTo });
    }

    qb.orderBy('signInAudit.createdAt', order);

    const rowsCount = await qb.getCount();
    const lastPage = Math.ceil(rowsCount / perPage);
    const offset = (page - 1) * perPage;

    qb.limit(perPage);
    qb.offset(offset);

    const logs = await qb.getMany();

    return {
      logs,
      pagination: {
        currentPage: page,
        lastPage,
        perPage,
        total: rowsCount,
      },
    };
  },

  async findSignInAuditLogsByUserId(
    userId: string,
    options: IFindSignInAuditLogsOptions,
  ): Promise<IFoundSignInAuditLogsResult> {
    const { order, page, perPage, dateFrom, dateTo, status, signInMethod } = options;

    const qb = this.createQueryBuilder('signInAudit')
      .leftJoinAndSelect('signInAudit.user', 'user')
      .where('user.id = :userId', { userId });

    if (status) {
      qb.andWhere('signInAudit.status = :status', { status });
    }

    if (signInMethod) {
      qb.andWhere('signInAudit.signInMethod = :signInMethod', { signInMethod });
    }

    if (dateFrom && dateTo) {
      qb.andWhere('signInAudit.createdAt >= :dateFrom', { dateFrom });
      qb.andWhere('signInAudit.createdAt <= :dateTo', { dateTo });
    }

    qb.orderBy('signInAudit.createdAt', order);

    const rowsCount = await qb.getCount();
    const lastPage = Math.ceil(rowsCount / perPage);
    const offset = (page - 1) * perPage;

    qb.limit(perPage);
    qb.offset(offset);

    const logs = await qb.getMany();

    return {
      logs,
      pagination: {
        currentPage: page,
        lastPage,
        perPage,
        total: rowsCount,
      },
    };
  },
};
