import { SavedDbQueryEntity } from '../saved-db-query.entity.js';
import { ISavedDbQueryRepository } from './saved-db-query.repository.interface.js';

export const savedDbQueryCustomRepositoryExtension: ISavedDbQueryRepository = {
	async findAllQueriesByConnectionId(connectionId: string): Promise<SavedDbQueryEntity[]> {
		const qb = this.createQueryBuilder('saved_db_query');
		qb.where('saved_db_query.connection_id = :connectionId', { connectionId });
		qb.orderBy('saved_db_query.created_at', 'DESC');
		return await qb.getMany();
	},

	async findQueryById(queryId: string): Promise<SavedDbQueryEntity | null> {
		const qb = this.createQueryBuilder('saved_db_query');
		qb.where('saved_db_query.id = :queryId', { queryId });
		return await qb.getOne();
	},

	async findQueryByIdAndConnectionId(queryId: string, connectionId: string): Promise<SavedDbQueryEntity | null> {
		const qb = this.createQueryBuilder('saved_db_query');
		qb.where('saved_db_query.id = :queryId', { queryId });
		qb.andWhere('saved_db_query.connection_id = :connectionId', { connectionId });
		return await qb.getOne();
	},
};
