import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignInAuditEntity } from './sign-in-audit.entity.js';
import { CreateSignInAuditRecordDs } from './dto/create-sign-in-audit-record.ds.js';
import { UserEntity } from '../user/user.entity.js';
import { FoundSignInAuditRecordDs } from './dto/found-sign-in-audit-record.ds.js';
import { buildFoundSignInAuditRecordDs } from './utils/build-found-sign-in-audit-record-ds.js';

@Injectable()
export class SignInAuditService {
  constructor(
    @InjectRepository(SignInAuditEntity)
    private readonly signInAuditRepository: Repository<SignInAuditEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  public async createSignInAuditRecord(data: CreateSignInAuditRecordDs): Promise<FoundSignInAuditRecordDs> {
    const { email, userId, status, signInMethod, ipAddress, userAgent, failureReason } = data;

    const newRecord = new SignInAuditEntity();
    newRecord.email = email?.toLowerCase();
    newRecord.status = status;
    newRecord.signInMethod = signInMethod;
    newRecord.ipAddress = ipAddress || null;
    newRecord.userAgent = userAgent || null;
    newRecord.failureReason = failureReason || null;

    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        newRecord.user = user;
        newRecord.userId = user.id;
      }
    }

    const savedRecord = await this.signInAuditRepository.save(newRecord);
    return buildFoundSignInAuditRecordDs(savedRecord);
  }
}
