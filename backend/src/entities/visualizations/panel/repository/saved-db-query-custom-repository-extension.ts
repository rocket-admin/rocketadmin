import { PanelEntity } from '../panel.entity.js';
import { IPanelRepository } from './saved-db-query.repository.interface.js';

export const panelCustomRepositoryExtension: IPanelRepository = {
	async findAllQueriesByConnectionId(connectionId: string): Promise<PanelEntity[]> {
		const qb = this.createQueryBuilder('panel');
		qb.where('panel.connection_id = :connectionId', { connectionId });
		qb.orderBy('panel.created_at', 'DESC');
		return await qb.getMany();
	},

	async findQueryById(queryId: string): Promise<PanelEntity | null> {
		const qb = this.createQueryBuilder('panel');
		qb.where('panel.id = :queryId', { queryId });
		return await qb.getOne();
	},

	async findQueryByIdAndConnectionId(queryId: string, connectionId: string): Promise<PanelEntity | null> {
		const qb = this.createQueryBuilder('panel');
		qb.where('panel.id = :queryId', { queryId });
		qb.andWhere('panel.connection_id = :connectionId', { connectionId });
		return await qb.getOne();
	},
};
