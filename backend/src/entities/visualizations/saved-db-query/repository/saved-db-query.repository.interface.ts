import { SavedDbQueryEntity } from '../saved-db-query.entity.js';

export interface ISavedDbQueryRepository {
	findAllQueriesByConnectionId(connectionId: string): Promise<SavedDbQueryEntity[]>;
	findQueryById(queryId: string): Promise<SavedDbQueryEntity | null>;
	findQueryByIdAndConnectionId(queryId: string, connectionId: string): Promise<SavedDbQueryEntity | null>;
}
