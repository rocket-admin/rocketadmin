import { getConnection, QueryRunner } from 'typeorm';
import { Injectable, Scope } from '@nestjs/common';
import { IGlobalDatabaseContext } from './global-database-context.intarface';
import { UserRepository } from '../../entities/user/repository/user.repository';
import { ConnectionRepository } from '../../entities/connection/repository/connection.repository';
import { GroupRepository } from '../../entities/group/repository/group.repository';
import { PermissionRepository } from '../../entities/permission/repository/permission.repository';
import { TableSettingsRepository } from '../../entities/table-settings/repository/table-settings.repository';
import { UserAccessRepository } from '../../entities/user-access/repository/user-access.repository';
import { AgentRepository } from '../../entities/agent/repository/agent.repository';
import { EmailVerificationRepository } from '../../entities/email/repository/email-verification.repository';
import { PasswordResetRepository } from '../../entities/user/user-password/repository/password-reset-repository';
import { EmailChangeRepository } from '../../entities/user/user-email/repository/email-change.repository';
import { UserInvitationRepository } from '../../entities/user/user-invitation/repository/user-invitation-repository';
import { ConnectionPropertiesRepository } from '../../entities/connection-properties/repository/connection-properties.repository';
import { CustomFieldsRepository } from '../../entities/custom-field/repository/custom-fields-repository';
import { TableLogsRepository } from '../../entities/table-logs/repository/table-logs.repository';
import { UserActionRepository } from '../../entities/user-actions/repository/user-action.repository';
import { LogOutRepository } from '../../entities/log-out/repository/log-out.repository';
import { TableWidgetsRepository } from '../../entities/widget/repository/table-widgets.repository';

@Injectable({ scope: Scope.REQUEST })
export class GlobalDatabaseContext implements IGlobalDatabaseContext {
  private _queryRunner: QueryRunner;

  private _userRepository: UserRepository;
  private _connectionRepository: ConnectionRepository;
  private _groupRepository: GroupRepository;
  private _permissionRepository: PermissionRepository;
  private _tableSettingsRepository: TableSettingsRepository;
  private _userAccessRepository: UserAccessRepository;
  private _agentRepository: AgentRepository;
  private _emailVerificationRepository: EmailVerificationRepository;
  private _passwordResetRepository: PasswordResetRepository;
  private _emailChangeRepository: EmailChangeRepository;
  private _userInvitationRepository: UserInvitationRepository;
  private _connectionPropertiesRepository: ConnectionPropertiesRepository;
  private _customFieldsRepository: CustomFieldsRepository;
  private _tableLogsRepository: TableLogsRepository;
  private _userActionRepository: UserActionRepository;
  private _logOutRepository: LogOutRepository;
  private _tableWidgetsRepository: TableWidgetsRepository;

  public constructor() {
    this._queryRunner = getConnection().createQueryRunner();
    this.initRepositories();
  }

  private initRepositories(): void {
    this._userRepository = this._queryRunner.manager.getCustomRepository(UserRepository);
    this._connectionRepository = this._queryRunner.manager.getCustomRepository(ConnectionRepository);
    this._groupRepository = this._queryRunner.manager.getCustomRepository(GroupRepository);
    this._permissionRepository = this._queryRunner.manager.getCustomRepository(PermissionRepository);
    this._tableSettingsRepository = this._queryRunner.manager.getCustomRepository(TableSettingsRepository);
    this._userAccessRepository = this._queryRunner.manager.getCustomRepository(UserAccessRepository);
    this._agentRepository = this._queryRunner.manager.getCustomRepository(AgentRepository);
    this._emailVerificationRepository = this._queryRunner.manager.getCustomRepository(EmailVerificationRepository);
    this._passwordResetRepository = this._queryRunner.manager.getCustomRepository(PasswordResetRepository);
    this._emailChangeRepository = this._queryRunner.manager.getCustomRepository(EmailChangeRepository);
    this._userInvitationRepository = this._queryRunner.manager.getCustomRepository(UserInvitationRepository);
    this._connectionPropertiesRepository =
      this._queryRunner.manager.getCustomRepository(ConnectionPropertiesRepository);
    this._customFieldsRepository = this._queryRunner.manager.getCustomRepository(CustomFieldsRepository);
    this._tableLogsRepository = this._queryRunner.manager.getCustomRepository(TableLogsRepository);
    this._userActionRepository = this._queryRunner.manager.getCustomRepository(UserActionRepository);
    this._logOutRepository = this._queryRunner.manager.getCustomRepository(LogOutRepository);
    this._tableWidgetsRepository = this._queryRunner.manager.getCustomRepository(TableWidgetsRepository);
  }

  public get userRepository(): UserRepository {
    return this._userRepository;
  }

  public get connectionRepository(): ConnectionRepository {
    return this._connectionRepository;
  }

  public get groupRepository(): GroupRepository {
    return this._groupRepository;
  }

  public get permissionRepository(): PermissionRepository {
    return this._permissionRepository;
  }

  public get tableSettingsRepository(): TableSettingsRepository {
    return this._tableSettingsRepository;
  }

  public get userAccessRepository(): UserAccessRepository {
    return this._userAccessRepository;
  }

  public get agentRepository(): AgentRepository {
    return this._agentRepository;
  }

  public get emailVerificationRepository(): EmailVerificationRepository {
    return this._emailVerificationRepository;
  }

  public get passwordResetRepository(): PasswordResetRepository {
    return this._passwordResetRepository;
  }

  public get emailChangeRepository(): EmailChangeRepository {
    return this._emailChangeRepository;
  }

  public get userInvitationRepository(): UserInvitationRepository {
    return this._userInvitationRepository;
  }

  public get connectionPropertiesRepository(): ConnectionPropertiesRepository {
    return this._connectionPropertiesRepository;
  }

  public get customFieldsRepository(): CustomFieldsRepository {
    return this._customFieldsRepository;
  }

  public get tableLogsRepository(): TableLogsRepository {
    return this._tableLogsRepository;
  }

  public get userActionRepository(): UserActionRepository {
    return this._userActionRepository;
  }

  public get logOutRepository(): LogOutRepository {
    return this._logOutRepository;
  }

  public get tableWidgetsRepository(): TableWidgetsRepository {
    return this._tableWidgetsRepository;
  }

  public startTransaction(): Promise<void> {
    return this._queryRunner.startTransaction();
  }

  public async commitTransaction(): Promise<void> {
    await this._queryRunner.commitTransaction();

    await this._queryRunner.release();
  }

  public async rollbackTransaction(): Promise<void> {
    await this._queryRunner.rollbackTransaction();

    await this._queryRunner.release();
  }
}
