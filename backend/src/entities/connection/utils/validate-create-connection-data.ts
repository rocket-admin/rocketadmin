import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { isRedisConnectionUrl } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import {
	ConnectionTypesEnum,
	ConnectionTypeTestEnum,
} from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import validator from 'validator';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent, toPrettyErrorsMsg } from '../../../helpers/index.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { isHostAllowed } from './is-host-allowed.js';

export async function validateCreateConnectionData(
	createConnectionData: CreateConnectionDs | UpdateConnectionDs,
): Promise<boolean> {
	const {
		connection_parameters: { port, ssh, sshHost, sshPort, title, host, sshUsername, username, database, type },
	} = createConnectionData;
	const errors: Array<string> = [];
	if (!type) errors.push(Messages.TYPE_MISSING);
	if (!validateConnectionType(type)) errors.push(Messages.CONNECTION_TYPE_INVALID);
	if (!isConnectionTypeAgent(type)) {
		if (!host) {
			errors.push(Messages.HOST_MISSING);
		}

		if (host && isRedisConnectionUrl(host)) {
			if (errors.length > 0) {
				throw new HttpException(
					{ message: toPrettyErrorsMsg(errors) },
					HttpStatus.BAD_REQUEST,
				);
			}
			return true;
		}

		if (!username && type !== ConnectionTypesEnum.redis) errors.push(Messages.USERNAME_MISSING);

		if (
			type !== ConnectionTypesEnum.dynamodb &&
			type !== ConnectionTypesEnum.elasticsearch &&
			type !== ConnectionTypesEnum.redis
		) {
			if (!database) errors.push(Messages.DATABASE_MISSING);

			if (process.env.NODE_ENV !== 'test' && !ssh && host) {
				if (!host.startsWith('mongodb+srv')) {
					if (!validator.isFQDN(host) && !validator.isIP(host)) {
						errors.push(Messages.HOST_NAME_INVALID);
					}
				}
			}

			if (port < 0 || port > 65535 || !port) errors.push(Messages.PORT_MISSING);
			if (typeof port !== 'number') errors.push(Messages.PORT_FORMAT_INCORRECT);
			if (typeof ssh !== 'boolean') errors.push(Messages.SSH_FORMAT_INCORRECT);
			if (ssh) {
				if (typeof sshPort !== 'number') {
					errors.push(Messages.SSH_PORT_FORMAT_INCORRECT);
				}
				if (!sshPort) errors.push(Messages.SSH_PORT_MISSING);
				if (!sshUsername) errors.push(Messages.SSH_USERNAME_MISSING);
				if (!sshHost) errors.push(Messages.SSH_HOST_MISSING);
			}
		}
	} else {
		if (!title) errors.push('Connection title missing');
	}

	if (errors.length > 0) {
		throw new HttpException(
			{
				message: toPrettyErrorsMsg(errors),
			},
			HttpStatus.BAD_REQUEST,
		);
	} else {
		const checkingResult = await isHostAllowed(createConnectionData.connection_parameters);
		if (!checkingResult) {
			throw new HttpException(
				{
					message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST,
				},
				HttpStatus.FORBIDDEN,
			);
		}
		return true;
	}
}

function validateConnectionType(type: string): string {
	if (process.env.NODE_ENV === 'test') {
		return Object.keys(ConnectionTypeTestEnum).find((key) => key === type);
	}
	return Object.keys(ConnectionTypesEnum).find((key) => key === type);
}
