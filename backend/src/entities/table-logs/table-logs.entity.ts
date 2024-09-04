import sjson from 'secure-json-parse';
import {
  AfterLoad,
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../enums/index.js';
import { Transform } from 'class-transformer';

@Entity('tableLogs')
export class TableLogsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  table_name: string;

  @Column({ default: null })
  affected_primary_key: string;

  @Column({ default: null })
  received_data: string;

  @Column({ default: null })
  old_data: string;

  @Column({ default: null })
  cognitoUserName: string;

  @Column({ default: null })
  email: string;

  @Column('enum', {
    nullable: false,
    enum: LogOperationTypeEnum,
    default: LogOperationTypeEnum.unknown,
  })
  operationType!: LogOperationTypeEnum;

  @Column('enum', {
    nullable: false,
    enum: OperationResultStatusEnum,
    default: OperationResultStatusEnum.unknown,
  })
  operationStatusResult!: OperationResultStatusEnum;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @BeforeInsert()
  stringifyRow() {
    if (this.old_data) {
      this.old_data = JSON.stringify(this.old_data);
    }
    if (this.received_data) {
      this.received_data = JSON.stringify(this.received_data);
    }
    if(this.affected_primary_key) {
      this.affected_primary_key = JSON.stringify(this.affected_primary_key);
    }
  }

  @AfterLoad()
  parseRow() {
    try {
      if (this.old_data) {
        this.old_data = sjson.parse(this.old_data, null, {
          protoAction: 'remove',
          constructorAction: 'remove',
        });
      }
      if (this.received_data) {
        this.received_data = sjson.parse(this.received_data, null, {
          protoAction: 'remove',
          constructorAction: 'remove',
        });
      }
      if(this.affected_primary_key) {
        this.affected_primary_key = sjson.parse(this.affected_primary_key, null, {
          protoAction: 'remove',
          constructorAction: 'remove',
        });
      }
    } catch (_e) {}
  }

  @Transform((connection: any) => connection.id)
  @ManyToOne((_) => ConnectionEntity, (connection) => connection.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  connection_id: Relation<ConnectionEntity>;
}
