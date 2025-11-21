import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserSecretEntity } from './user-secret.entity.js';
import { SecretAccessLogEntity, SecretActionEnum } from '../secret-access-log/secret-access-log.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CreateSecretDto } from './application/dto/create-secret.dto.js';
import { UpdateSecretDto } from './application/dto/update-secret.dto.js';
import { FoundSecretDto } from './application/dto/found-secret.dto.js';
import { SecretListResponseDto, SecretListItemDto } from './application/dto/secret-list.dto.js';
import { AuditLogResponseDto, AuditLogEntryDto } from './application/dto/audit-log.dto.js';

@Injectable()
export class UserSecretsService {
  constructor(
    @InjectRepository(UserSecretEntity)
    private readonly secretRepository: Repository<UserSecretEntity>,
    @InjectRepository(SecretAccessLogEntity)
    private readonly auditLogRepository: Repository<SecretAccessLogEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  private async getUserWithCompany(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user || !user.company) {
      throw new ForbiddenException('User not found or not associated with a company');
    }

    return user;
  }

  private async logAccess(
    secretId: string,
    userId: string,
    action: SecretActionEnum,
    success: boolean = true,
    errorMessage?: string,
  ): Promise<void> {
    const log = this.auditLogRepository.create({
      secretId,
      userId,
      action,
      success,
      errorMessage,
      accessedAt: new Date(),
    });

    await this.auditLogRepository.save(log);
  }

  async createSecret(userId: string, createDto: CreateSecretDto): Promise<FoundSecretDto> {
    const user = await this.getUserWithCompany(userId);

    // Check if slug already exists in company
    const existing = await this.secretRepository.findOne({
      where: {
        slug: createDto.slug,
        companyId: user.company.id,
      },
    });

    if (existing) {
      throw new ConflictException('Secret with this slug already exists in your company');
    }

    // Create secret
    const secret = this.secretRepository.create({
      slug: createDto.slug,
      encryptedValue: createDto.value, // TODO: Encrypt with PRIVATE_KEY and optionally master password
      companyId: user.company.id,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
      masterEncryption: createDto.masterEncryption || false,
      masterHash: createDto.masterPassword ? 'TODO: Hash master password' : null, // TODO: Hash master password
    });

    const saved = await this.secretRepository.save(secret);

    // Log creation
    await this.logAccess(saved.id, userId, SecretActionEnum.CREATE);

    return this.buildFoundSecretDto(saved, false);
  }

  async getSecrets(
    userId: string,
    options: { page: number; limit: number; search?: string },
  ): Promise<SecretListResponseDto> {
    const user = await this.getUserWithCompany(userId);

    const where: any = {
      companyId: user.company.id,
    };

    if (options.search) {
      where.slug = Like(`%${options.search}%`);
    }

    const [secrets, total] = await this.secretRepository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return {
      data: secrets.map((secret) => this.buildSecretListItemDto(secret)),
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async getSecretBySlug(userId: string, slug: string, masterPassword?: string): Promise<FoundSecretDto> {
    const user = await this.getUserWithCompany(userId);

    const secret = await this.secretRepository.findOne({
      where: {
        slug,
        companyId: user.company.id,
      },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    // Check expiration
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new GoneException('Secret has expired');
    }

    // Check master password if required
    if (secret.masterEncryption && !masterPassword) {
      throw new ForbiddenException('Master password required');
    }

    if (secret.masterEncryption && masterPassword) {
      // TODO: Verify master password
      const isValid = true; // TODO: Verify against masterHash
      if (!isValid) {
        await this.logAccess(secret.id, userId, SecretActionEnum.VIEW, false, 'Invalid master password');
        throw new ForbiddenException('Invalid master password');
      }
    }

    // Update last accessed
    secret.lastAccessedAt = new Date();
    await this.secretRepository.save(secret);

    // Log access
    await this.logAccess(secret.id, userId, SecretActionEnum.VIEW);

    return this.buildFoundSecretDto(secret, true);
  }

  async updateSecret(
    userId: string,
    slug: string,
    updateDto: UpdateSecretDto,
    masterPassword?: string,
  ): Promise<FoundSecretDto> {
    const user = await this.getUserWithCompany(userId);

    const secret = await this.secretRepository.findOne({
      where: {
        slug,
        companyId: user.company.id,
      },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    // Check expiration
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new GoneException('Secret has expired');
    }

    // Check master password if required
    if (secret.masterEncryption && !masterPassword) {
      throw new ForbiddenException('Master password required');
    }

    // Update secret
    secret.encryptedValue = updateDto.value; // TODO: Encrypt
    if (updateDto.expiresAt !== undefined) {
      secret.expiresAt = updateDto.expiresAt ? new Date(updateDto.expiresAt) : null;
    }

    const updated = await this.secretRepository.save(secret);

    // Log update
    await this.logAccess(secret.id, userId, SecretActionEnum.UPDATE);

    return this.buildFoundSecretDto(updated, false);
  }

  async deleteSecret(userId: string, slug: string): Promise<{ message: string; deletedAt: Date }> {
    const user = await this.getUserWithCompany(userId);

    const secret = await this.secretRepository.findOne({
      where: {
        slug,
        companyId: user.company.id,
      },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    // Log deletion before deleting
    await this.logAccess(secret.id, userId, SecretActionEnum.DELETE);

    // Permanently delete
    await this.secretRepository.remove(secret);

    return {
      message: 'Secret deleted successfully',
      deletedAt: new Date(),
    };
  }

  async getAuditLog(
    userId: string,
    slug: string,
    options: { page: number; limit: number },
  ): Promise<AuditLogResponseDto> {
    const user = await this.getUserWithCompany(userId);

    const secret = await this.secretRepository.findOne({
      where: {
        slug,
        companyId: user.company.id,
      },
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: {
        secretId: secret.id,
      },
      relations: ['user'],
      order: {
        accessedAt: 'DESC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return {
      data: logs.map((log) => this.buildAuditLogEntryDto(log)),
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  private buildFoundSecretDto(secret: UserSecretEntity, includeValue: boolean): FoundSecretDto {
    return {
      id: secret.id,
      slug: secret.slug,
      value: includeValue ? secret.encryptedValue : undefined, // TODO: Decrypt
      companyId: secret.companyId,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      lastAccessedAt: secret.lastAccessedAt,
      expiresAt: secret.expiresAt,
      masterEncryption: secret.masterEncryption,
    };
  }

  private buildSecretListItemDto(secret: UserSecretEntity): SecretListItemDto {
    return {
      id: secret.id,
      slug: secret.slug,
      companyId: secret.companyId,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      lastAccessedAt: secret.lastAccessedAt,
      expiresAt: secret.expiresAt,
      masterEncryption: secret.masterEncryption,
    };
  }

  private buildAuditLogEntryDto(log: SecretAccessLogEntity): AuditLogEntryDto {
    return {
      id: log.id,
      action: log.action,
      user: {
        id: log.user.id,
        email: log.user.email,
      },
      accessedAt: log.accessedAt,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      success: log.success,
      errorMessage: log.errorMessage,
    };
  }
}
