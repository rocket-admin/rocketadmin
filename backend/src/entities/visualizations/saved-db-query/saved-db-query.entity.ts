import {
	AfterLoad,
	BeforeInsert,
	BeforeUpdate,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	Relation,
} from 'typeorm';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { DashboardWidgetEntity } from '../dashboard/dashboard-widget.entity.js';

@Entity('saved_db_query')
export class SavedDbQueryEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column({ type: 'text', default: null, nullable: true })
	description: string | null;

	@Column({ type: 'text' })
	query_text: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@BeforeInsert()
	encryptQueryTextOnInsert(): void {
		if (this.query_text) {
			this.query_text = Encryptor.encryptData(this.query_text);
		}
	}

	@BeforeUpdate()
	encryptQueryTextOnUpdate(): void {
		this.updated_at = new Date();
		if (this.query_text) {
			this.query_text = Encryptor.encryptData(this.query_text);
		}
	}

	@AfterLoad()
	decryptQueryText(): void {
		if (this.query_text) {
			this.query_text = Encryptor.decryptData(this.query_text);
		}
	}

	@ManyToOne(
		() => ConnectionEntity,
		(connection) => connection.saved_db_queries,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'connection_id' })
	connection: Relation<ConnectionEntity>;

	@Column({ type: 'varchar', length: 38 })
	connection_id: string;

	@OneToMany(
		() => DashboardWidgetEntity,
		(widget) => widget.query,
	)
	widgets: Relation<DashboardWidgetEntity>[];
}
