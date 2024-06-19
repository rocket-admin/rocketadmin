import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { TableActionTypeEnum } from '../../enums/index.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { TableTriggersEntity } from '../table-triggers/table-triggers.entity.js';
import { TableActionMethodEnum } from '../../enums/table-action-method-enum.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';

@Entity('table_actions')
export class TableActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('enum', {
    nullable: false,
    enum: TableActionTypeEnum,
    default: TableActionTypeEnum.single,
  })
  type!: TableActionTypeEnum;

  @Column({ default: null })
  url: string;

  @Column({ default: false })
  require_confirmation: boolean;

  @Column('enum', {
    nullable: false,
    enum: TableActionMethodEnum,
    default: TableActionMethodEnum.HTTP,
  })
  method!: TableActionMethodEnum;

  @Column({ default: null })
  slack_url: string;

  @Column('varchar', { array: true, default: {} })
  emails: string[];

  @ManyToOne(() => TableSettingsEntity, (settings) => settings.table_actions, { onDelete: 'CASCADE' })
  settings: Relation<TableSettingsEntity>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  @ManyToMany((type) => TableTriggersEntity, (triggers) => triggers.table_actions)
  table_triggers: Relation<TableTriggersEntity>[];

  @BeforeInsert()
  encryptEmailsAndTokens(): void {
    if (this.slack_url) {
      this.slack_url = Encryptor.encryptData(this.slack_url);
    }
  }

  @BeforeUpdate()
  encryptEmailsAndTokensBeforeUpdate(): void {
    this.encryptEmailsAndTokens();
  }

  @AfterLoad()
  decryptEmailsAndTokens(): void {
    if (this.slack_url) {
      this.slack_url = Encryptor.decryptData(this.slack_url);
    }
  }
}
