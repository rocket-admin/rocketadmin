/* eslint-disable @typescript-eslint/no-unused-vars */
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { ActionEventsEntity } from '../table-action-events-module/action-event.entity.js';
import { TableActionEntity } from '../table-actions-module/table-action.entity.js';

@Entity('action_rules')
export class ActionRulesEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ default: null })
	table_name: string;

	@Column({ default: null })
	title: string;

	@OneToMany(
		(_type) => TableActionEntity,
		(action) => action.action_rule,
	)
	table_actions: Relation<TableActionEntity>[];

	@OneToMany(
		(_type) => ActionEventsEntity,
		(event) => event.action_rule,
	)
	action_events: Relation<ActionEventsEntity>[];

	@ManyToOne(
		(_type) => ConnectionEntity,
		(connection) => connection.action_rules,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'connection_id' })
	connection: Relation<ConnectionEntity>;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	created_at: Date;
}
