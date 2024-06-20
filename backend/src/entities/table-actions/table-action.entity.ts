/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { ActionRulesEntity } from '../table-triggers/action-rules.entity.js';
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

  @ManyToMany((type) => ActionRulesEntity, (rules) => rules.table_actions)
  action_rules: Relation<ActionRulesEntity>[];

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
