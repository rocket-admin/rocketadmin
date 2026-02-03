import sjson from 'secure-json-parse';
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
import { DashboardWidgetEntity } from '../dashboard-widget/dashboard-widget.entity.js';
import { DashboardWidgetTypeEnum } from '../../../enums/dashboard-widget-type.enum.js';

@Entity('saved_db_query')
export class SavedDbQueryEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column({ type: 'text', default: null, nullable: true })
	description: string | null;

	@Column({ type: 'varchar' })
	widget_type: DashboardWidgetTypeEnum;

	@Column({ type: 'varchar', default: null, nullable: true })
	chart_type: string | null;

	@Column('json', { default: null, nullable: true })
	widget_options: string | null;

	@Column({ type: 'text' })
	query_text: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@BeforeInsert()
	encryptQueryTextStringifyOptionsOnInsert(): void {
		if (this.query_text) {
			this.query_text = Encryptor.encryptData(this.query_text);
		}
		try {
			if (this.widget_options && typeof this.widget_options === 'object') {
				this.widget_options = JSON.stringify(this.widget_options);
			}
		} catch (e) {
			console.error('-> Error widget options stringify ' + e.message);
		}
	}

	@BeforeUpdate()
	encryptQueryTextStringifyOptionsOnUpdate(): void {
		this.updated_at = new Date();
		if (this.query_text) {
			this.query_text = Encryptor.encryptData(this.query_text);
		}
		try {
			if (this.widget_options && typeof this.widget_options === 'object') {
				this.widget_options = JSON.stringify(this.widget_options);
			}
		} catch (e) {
			console.error('-> Error widget options stringify ' + e.message);
		}
	}

	@AfterLoad()
	decryptQueryTextParseOptions(): void {
		if (this.query_text) {
			this.query_text = Encryptor.decryptData(this.query_text);
		}
		try {
			if (this.widget_options && typeof this.widget_options === 'string') {
				this.widget_options = sjson.parse(this.widget_options, null, {
					protoAction: 'remove',
					constructorAction: 'remove',
				});
			}
		} catch (e) {
			console.error('-> Error widget options parse ' + e.message);
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
