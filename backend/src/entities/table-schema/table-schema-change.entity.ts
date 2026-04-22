import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { SchemaChangeStatusEnum, SchemaChangeTypeEnum } from './table-schema-change-enums.js';

@Entity('table_schema_change')
@Index('IDX_tsc_connection_created', ['connectionId', 'createdAt'])
@Index('IDX_tsc_previous_change', ['previousChangeId'])
export class TableSchemaChangeEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 38 })
	connectionId: string;

	@ManyToOne(() => ConnectionEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'connectionId' })
	connection: Relation<ConnectionEntity>;

	@Column({ type: 'uuid', nullable: true })
	authorId: string | null;

	@ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'authorId' })
	author: Relation<UserEntity> | null;

	@Column({ type: 'uuid', nullable: true })
	previousChangeId: string | null;

	@ManyToOne(() => TableSchemaChangeEntity, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'previousChangeId' })
	previousChange: Relation<TableSchemaChangeEntity> | null;

	@Column({ type: 'text' })
	forwardSql: string;

	@Column({ type: 'text', nullable: true })
	rollbackSql: string | null;

	@Column({ type: 'text', nullable: true })
	userModifiedSql: string | null;

	@Column({
		type: 'enum',
		enum: SchemaChangeStatusEnum,
		default: SchemaChangeStatusEnum.PENDING,
	})
	status: SchemaChangeStatusEnum;

	@Column({ type: 'enum', enum: SchemaChangeTypeEnum })
	changeType: SchemaChangeTypeEnum;

	@Column({ type: 'varchar', length: 255 })
	targetTableName: string;

	@Column({ type: 'enum', enum: ConnectionTypesEnum })
	databaseType: ConnectionTypesEnum;

	@Column({ type: 'text', nullable: true })
	executionError: string | null;

	@Column({ type: 'boolean', default: false })
	isReversible: boolean;

	@Column({ type: 'boolean', default: false })
	autoRollbackAttempted: boolean;

	@Column({ type: 'boolean', default: false })
	autoRollbackSucceeded: boolean;

	@Column({ type: 'text' })
	userPrompt: string;

	@Column({ type: 'text', nullable: true })
	aiSummary: string | null;

	@Column({ type: 'text', nullable: true })
	aiReasoning: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	aiModelUsed: string | null;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	createdAt: Date;

	@Column({ type: 'timestamp', nullable: true })
	appliedAt: Date | null;

	@Column({ type: 'timestamp', nullable: true })
	rolledBackAt: Date | null;
}
