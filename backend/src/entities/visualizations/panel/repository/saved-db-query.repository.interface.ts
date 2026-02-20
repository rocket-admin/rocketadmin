import { PanelEntity } from '../panel.entity.js';

export interface IPanelRepository {
	findAllQueriesByConnectionId(connectionId: string): Promise<PanelEntity[]>;
	findQueryById(queryId: string): Promise<PanelEntity | null>;
	findQueryByIdAndConnectionId(queryId: string, connectionId: string): Promise<PanelEntity | null>;
}
