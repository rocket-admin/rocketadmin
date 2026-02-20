import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { PanelPositionEntity } from '../panel-position/panel-position.entity.js';

@Entity('dashboard')
export class DashboardEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column({ type: 'text', default: null, nullable: true })
	description: string | null;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	updated_at: Date;

	@Column({ type: 'uuid' })
	connection_id: string;

	@ManyToOne(() => ConnectionEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'connection_id' })
	connection: Relation<ConnectionEntity>;

	@OneToMany(
		() => PanelPositionEntity,
		(widget) => widget.dashboard,
	)
	widgets: Relation<PanelPositionEntity>[];
}
