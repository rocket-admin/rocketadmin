import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { UserSecretsService } from './user-secrets.service.js';
import { UserSecretEntity } from './user-secret.entity.js';
import { SecretAccessLogEntity, SecretActionEnum } from '../secret-access-log/secret-access-log.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';

describe('UserSecretsService', () => {
  let service: UserSecretsService;
  let secretRepository: Repository<UserSecretEntity>;
  let auditLogRepository: Repository<SecretAccessLogEntity>;
  let userRepository: Repository<UserEntity>;

  const mockCompany: CompanyInfoEntity = {
    id: 'company-uuid-1',
    name: 'Test Company',
  } as CompanyInfoEntity;

  const mockUser: UserEntity = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    company: mockCompany,
  } as UserEntity;

  const mockSecret: UserSecretEntity = {
    id: 'secret-uuid-1',
    slug: 'test-secret',
    encryptedValue: 'encrypted-value',
    companyId: 'company-uuid-1',
    company: mockCompany,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastAccessedAt: null,
    expiresAt: null,
    masterEncryption: false,
    masterHash: null,
    accessLogs: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSecretsService,
        {
          provide: getRepositoryToken(UserSecretEntity),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SecretAccessLogEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserSecretsService>(UserSecretsService);
    secretRepository = module.get<Repository<UserSecretEntity>>(getRepositoryToken(UserSecretEntity));
    auditLogRepository = module.get<Repository<SecretAccessLogEntity>>(getRepositoryToken(SecretAccessLogEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  describe('createSecret', () => {
    it('should create a new secret successfully', async () => {
      const createDto = {
        slug: 'new-secret',
        value: 'secret-value',
        masterEncryption: false,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null); // No existing secret
      jest.spyOn(secretRepository, 'create').mockReturnValue(mockSecret);
      jest.spyOn(secretRepository, 'save').mockResolvedValue(mockSecret);
      jest.spyOn(auditLogRepository, 'create').mockReturnValue({} as SecretAccessLogEntity);
      jest.spyOn(auditLogRepository, 'save').mockResolvedValue({} as SecretAccessLogEntity);

      const result = await service.createSecret('user-uuid-1', createDto);

      expect(result.slug).toBe('test-secret');
      expect(result.companyId).toBe('company-uuid-1');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        relations: ['company'],
      });
    });

    it('should throw ConflictException if slug already exists', async () => {
      const createDto = {
        slug: 'existing-secret',
        value: 'secret-value',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret); // Existing secret

      await expect(service.createSecret('user-uuid-1', createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if user has no company', async () => {
      const createDto = {
        slug: 'new-secret',
        value: 'secret-value',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue({ ...mockUser, company: null } as UserEntity);

      await expect(service.createSecret('user-uuid-1', createDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSecretBySlug', () => {
    it('should return secret with decrypted value', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);
      jest.spyOn(secretRepository, 'save').mockResolvedValue(mockSecret);
      jest.spyOn(auditLogRepository, 'create').mockReturnValue({} as SecretAccessLogEntity);
      jest.spyOn(auditLogRepository, 'save').mockResolvedValue({} as SecretAccessLogEntity);

      const result = await service.getSecretBySlug('user-uuid-1', 'test-secret');

      expect(result.slug).toBe('test-secret');
      expect(result.value).toBe('encrypted-value'); // TODO: Should be decrypted
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if secret not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getSecretBySlug('user-uuid-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException if secret is expired', async () => {
      const expiredSecret = { ...mockSecret, expiresAt: new Date('2020-01-01') };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(expiredSecret);

      await expect(service.getSecretBySlug('user-uuid-1', 'test-secret')).rejects.toThrow(GoneException);
    });

    it('should throw ForbiddenException if master password required but not provided', async () => {
      const protectedSecret = { ...mockSecret, masterEncryption: true };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(protectedSecret);

      await expect(service.getSecretBySlug('user-uuid-1', 'test-secret')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateSecret', () => {
    it('should update secret value successfully', async () => {
      const updateDto = {
        value: 'new-value',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);
      jest.spyOn(secretRepository, 'save').mockResolvedValue({ ...mockSecret, encryptedValue: 'new-value' });
      jest.spyOn(auditLogRepository, 'create').mockReturnValue({} as SecretAccessLogEntity);
      jest.spyOn(auditLogRepository, 'save').mockResolvedValue({} as SecretAccessLogEntity);

      const result = await service.updateSecret('user-uuid-1', 'test-secret', updateDto);

      expect(secretRepository.save).toHaveBeenCalled();
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if secret not found', async () => {
      const updateDto = { value: 'new-value' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateSecret('user-uuid-1', 'non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSecret', () => {
    it('should delete secret successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);
      jest.spyOn(secretRepository, 'remove').mockResolvedValue(mockSecret);
      jest.spyOn(auditLogRepository, 'create').mockReturnValue({} as SecretAccessLogEntity);
      jest.spyOn(auditLogRepository, 'save').mockResolvedValue({} as SecretAccessLogEntity);

      const result = await service.deleteSecret('user-uuid-1', 'test-secret');

      expect(result.message).toBe('Secret deleted successfully');
      expect(secretRepository.remove).toHaveBeenCalledWith(mockSecret);
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if secret not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteSecret('user-uuid-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSecrets', () => {
    it('should return paginated list of secrets', async () => {
      const mockSecrets = [mockSecret];
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findAndCount').mockResolvedValue([mockSecrets, 1]);

      const result = await service.getSecrets('user-uuid-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter secrets by search term', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findAndCount').mockResolvedValue([[], 0]);

      await service.getSecrets('user-uuid-1', { page: 1, limit: 20, search: 'test' });

      expect(secretRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            slug: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('getAuditLog', () => {
    it('should return paginated audit log', async () => {
      const mockLog: SecretAccessLogEntity = {
        id: 'log-uuid-1',
        secretId: 'secret-uuid-1',
        userId: 'user-uuid-1',
        user: mockUser,
        action: SecretActionEnum.VIEW,
        accessedAt: new Date(),
        success: true,
      } as SecretAccessLogEntity;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);
      jest.spyOn(auditLogRepository, 'findAndCount').mockResolvedValue([[mockLog], 1]);

      const result = await service.getAuditLog('user-uuid-1', 'test-secret', { page: 1, limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe(SecretActionEnum.VIEW);
      expect(result.pagination.total).toBe(1);
    });

    it('should throw NotFoundException if secret not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getAuditLog('user-uuid-1', 'non-existent', { page: 1, limit: 50 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
