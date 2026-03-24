import { HttpException, HttpStatus } from '@nestjs/common';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';

export function validateConnection(connection: ConnectionEntity | null): asserts connection is ConnectionEntity {
	if (!connection) {
		throw new HttpException(
			{
				message: Messages.CONNECTION_NOT_FOUND,
			},
			HttpStatus.BAD_REQUEST,
		);
	}
	if (connection.is_frozen) {
		throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
	}
}

export async function getUserEmailForAgent(
	connection: ConnectionEntity,
	userId: string,
	userRepository: { getUserEmailOrReturnNull(userId: string): Promise<string> },
): Promise<string | undefined> {
	if (isConnectionTypeAgent(connection.type)) {
		return userRepository.getUserEmailOrReturnNull(userId);
	}
	return undefined;
}
