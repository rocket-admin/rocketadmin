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
import { DashboardWidgetTypeEnum } from '../../../enums/dashboard-widget-type.enum.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { PanelPositionEntity } from '../panel-position/panel-position.entity.js';

@Entity('panel')
export class PanelEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column({ type: 'text', default: null, nullable: true })
	description: string | null;

	@Column({ type: 'varchar', nullable: true, default: DashboardWidgetTypeEnum.Chart })
	panel_type: DashboardWidgetTypeEnum;

	@Column({ type: 'varchar', default: null, nullable: true })
	chart_type: string | null;

	@Column('json', { default: null, nullable: true })
	panel_options: string | null;

	@Column({ type: 'text', nullable: true, default: null })
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
			if (this.panel_options && typeof this.panel_options === 'object') {
				this.panel_options = JSON.stringify(this.panel_options);
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
			if (this.panel_options && typeof this.panel_options === 'object') {
				this.panel_options = JSON.stringify(this.panel_options);
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
			if (this.panel_options && typeof this.panel_options === 'string') {
				this.panel_options = sjson.parse(this.panel_options, null, {
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
		(connection) => connection.panels,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'connection_id' })
	connection: Relation<ConnectionEntity>;

	@Column({ type: 'varchar', length: 38 })
	connection_id: string;

	@OneToMany(
		() => PanelPositionEntity,
		(panel_position) => panel_position.query,
	)
	panels: Relation<PanelPositionEntity>[];
}
