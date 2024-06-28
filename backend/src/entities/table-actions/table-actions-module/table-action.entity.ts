/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { TableActionTypeEnum } from '../../../enums/index.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { ActionRulesEntity } from '../table-action-rules-module/action-rules.entity.js';
import { TableActionMethodEnum } from '../../../enums/table-action-method-enum.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';

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

  @Column('enum', {
    nullable: false,
    enum: TableActionMethodEnum,
    default: TableActionMethodEnum.URL,
  })
  method!: TableActionMethodEnum;

  @Column({ default: null })
  slack_url: string;

  @Column('varchar', { array: true, default: {} })
  emails: string[];

  @ManyToOne((type) => TableSettingsEntity, (settings) => settings.table_actions, { onDelete: 'CASCADE' })
  settings: Relation<TableSettingsEntity>;

  @ManyToOne((type) => ActionRulesEntity, (rules) => rules.table_actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'action_rule_id' })
  action_rule: Relation<ActionRulesEntity>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @BeforeInsert()
  encryptSlackUrl(): void {
    if (this.slack_url) {
      this.slack_url = Encryptor.encryptData(this.slack_url);
    }
  }

  @BeforeUpdate()
  encryptEmailsAndTokensBeforeUpdate(): void {
    this.encryptSlackUrl();
  }

  @AfterLoad()
  decryptSlackUrl(): void {
    if (this.slack_url) {
      this.slack_url = Encryptor.decryptData(this.slack_url);
    }
  }
}
