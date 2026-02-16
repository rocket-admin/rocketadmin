import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '../shared/interfaces/data-access-object-agent.interface.js';

export async function validateSchemaCache(
	dao: IDataAccessObject | IDataAccessObjectAgent,
	userEmail?: string,
): Promise<string | null> {
	try {
		if ('getSchemaHash' in dao && typeof dao.getSchemaHash === 'function') {
			if (isAgentDao(dao)) {
				if (userEmail) {
					const hash = await (dao as IDataAccessObjectAgent).getSchemaHash(userEmail);
					return hash;
				}
				return null;
			}

			const hash = await (dao as IDataAccessObject).getSchemaHash!();
			return hash;
		}

		return null;
	} catch (error) {
		console.warn('Schema hash validation failed, proceeding without cache validation:', error?.message || error);
		return null;
	}
}

function isAgentDao(dao: IDataAccessObject | IDataAccessObjectAgent): dao is IDataAccessObjectAgent {
	return dao.getTableStructure.length >= 2;
}
