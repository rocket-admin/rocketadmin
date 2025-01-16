import { Injectable, OnModuleInit } from '@nestjs/common';
import { isSaaS } from '../../helpers/app/is-saas.js';
import { FoundUserInGroupDs } from './application/data-structures/found-user-in-group.ds.js';
import { FoundUserDto } from './dto/found-user.dto.js';
import { UserEntity } from './user.entity.js';
import { getUserIntercomHash } from './utils/get-user-intercom-hash.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';
import { RegisterUserDs } from './application/data-structures/register-user-ds.js';
import { UserRoleEnum } from './enums/user-role.enum.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildRegisteringUser } from './utils/build-registering-user.util.js';

@Injectable()
export class UserHelperService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CompanyInfoEntity)
    private readonly companyInfoRepository: Repository<CompanyInfoEntity>,
  ) {}

  public buildFoundUserInGroupDs(user: UserEntity): FoundUserInGroupDs {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      isActive: user.isActive,
      name: user.name,
      suspended: user.suspended,
      externalRegistrationProvider: user.externalRegistrationProvider,
    };
  }

  public async buildFoundUserDs(user: UserEntity): Promise<FoundUserDto> {
    const intercomHash = getUserIntercomHash(user.id);
    return {
      id: user.id,
      createdAt: user.createdAt,
      suspended: user.suspended,
      isActive: user.isActive,
      email: user.email,
      intercom_hash: intercomHash,
      name: user.name,
      role: user.role,
      is_2fa_enabled: user.otpSecretKey !== null && user.isOTPEnabled,
      company: user.company ? { id: user.company.id } : null,
      externalRegistrationProvider: user.externalRegistrationProvider,
    };
  }

  public async onModuleInit(): Promise<void> {
    if (isSaaS()) {
      return;
    }
    const email = (process.env.ADMIN_EMAIL || 'admin@email.local').toLowerCase();
    const password =
      process.env.ADMIN_PASSWORD ||
      (process.env.NODE_ENV === 'test' ? 'test12345' : Encryptor.generateRandomString(10));

    const foundTestUser = await this.userRepository.findOneBy({ email: email });
    if (foundTestUser) {
      return;
    }

    const registerUserData: RegisterUserDs = {
      email: email,
      password: password,
      isActive: true,
      gclidValue: null,
      name: 'Admin',
      role: UserRoleEnum.ADMIN,
    };
    const savedUser = await this.userRepository.save(buildRegisteringUser(registerUserData));
    const newCompanyInfo = new CompanyInfoEntity();
    newCompanyInfo.id = Encryptor.generateUUID();
    const savedCompanyInfo = await this.companyInfoRepository.save(newCompanyInfo);
    savedUser.company = savedCompanyInfo;
    await this.userRepository.save(savedUser);
    console.info(`Admin user created with email: "${email}" and password: "${password}"`);
  }
}
