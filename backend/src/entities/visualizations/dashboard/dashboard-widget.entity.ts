import sjson from 'secure-json-parse';
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
import { DashboardWidgetTypeEnum } from '../../../enums/dashboard-widget-type.enum.js';
import { DashboardEntity } from './dashboard.entity.js';
import { SavedDbQueryEntity } from '../saved-db-query/saved-db-query.entity.js';

@Entity('dashboard_widget')
export class DashboardWidgetEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar' })
	widget_type: DashboardWidgetTypeEnum;

	@Column({ default: null, nullable: true })
	name: string | null;

	@Column({ type: 'text', default: null, nullable: true })
	description: string | null;

	@Column({ type: 'int', default: 0 })
	position_x: number;

	@Column({ type: 'int', default: 0 })
	position_y: number;

	@Column({ type: 'int', default: 4 })
	width: number;

	@Column({ type: 'int', default: 3 })
	height: number;

	@Column('json', { default: null, nullable: true })
	widget_options: string | null;

	@Column({ type: 'uuid' })
	dashboard_id: string;

	@ManyToOne(
		() => DashboardEntity,
		(dashboard) => dashboard.widgets,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'dashboard_id' })
	dashboard: Relation<DashboardEntity>;

	@Column({ type: 'uuid', nullable: true })
	query_id: string | null;

	@ManyToOne(() => SavedDbQueryEntity, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'query_id' })
	query: Relation<SavedDbQueryEntity> | null;

	@BeforeUpdate()
	stringifyOptionsOnUpdate(): void {
		try {
			if (this.widget_options && typeof this.widget_options === 'object') {
				this.widget_options = JSON.stringify(this.widget_options);
			}
		} catch (e) {
			console.error('-> Error widget options stringify ' + e.message);
		}
	}

	@BeforeInsert()
	stringifyOptions(): void {
		try {
			if (this.widget_options && typeof this.widget_options === 'object') {
				this.widget_options = JSON.stringify(this.widget_options);
			}
		} catch (e) {
			console.error('-> Error widget options stringify ' + e.message);
		}
	}

	@AfterLoad()
	parseOptions(): void {
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
}
