import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { DashboardEntity } from '../dashboard/dashboard.entity.js';
import { SavedDbQueryEntity } from '../saved-db-query/saved-db-query.entity.js';

@Entity('dashboard_widget')
export class DashboardWidgetEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'int', default: 0 })
	position_x: number;

	@Column({ type: 'int', default: 0 })
	position_y: number;

	@Column({ type: 'int', default: 4 })
	width: number;

	@Column({ type: 'int', default: 3 })
	height: number;

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
}
