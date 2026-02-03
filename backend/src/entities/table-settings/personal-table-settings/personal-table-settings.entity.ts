import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Relation,
	UpdateDateColumn,
} from 'typeorm';
import { QueryOrderingEnum } from '../../../enums/query-ordering.enum.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { UserEntity } from '../../user/user.entity.js';

@Entity('personal_table_settings')
export class PersonalTableSettingsEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null })
	table_name: string;

	@Column('enum', {
		nullable: true,
		enum: QueryOrderingEnum,
		default: null,
	})
	ordering!: QueryOrderingEnum;

	@Column('varchar', { default: null })
	ordering_field: string;

	@Column('int', { default: null })
	list_per_page: number;

	@Column('varchar', { array: true, default: {} })
	list_fields: string[];

	@Column({ type: 'varchar', array: true, default: {} })
	columns_view: Array<string>;

	@Column('boolean', { default: false })
	original_names: boolean;

	@CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
	updated_at: Date;

	@ManyToOne(
		(_) => ConnectionEntity,
		(connection) => connection.personal_table_settings,
		{
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn({ name: 'connection_id' })
	connection: Relation<ConnectionEntity>;

	@Column()
	connection_id: string;

	@ManyToOne(
		(_) => UserEntity,
		(user) => user.personal_table_settings,
		{
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn({ name: 'user_id' })
	user: Relation<UserEntity>;

	@Column()
	user_id: string;
}
