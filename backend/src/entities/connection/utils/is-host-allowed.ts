import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import dns from 'dns';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { isForbiddenAddress } from '../../../helpers/validators/is-forbidden-address.js';

export { isForbiddenAddress };

export interface HostCheckData {
	type?: string;
	host?: string;
	ssh?: boolean;
	sshHost?: string;
}

export async function isHostAllowed(connectionData: HostCheckData): Promise<boolean> {
	if (isConnectionTypeAgent(connectionData.type) || isTest()) {
		return true;
	}
	if (!isTest() && !isSaaS()) {
		return true;
	}

	const hostnameToCheck = connectionData.ssh ? connectionData.sshHost : connectionData.host;
	if (!hostnameToCheck) {
		return true;
	}

	const testHosts = Constants.getTestConnectionsHostNamesArr();
	if (testHosts.includes(connectionData.host ?? '')) {
		return true;
	}

	return new Promise<boolean>((resolve, reject) => {
		dns.lookup(hostnameToCheck, { all: true }, (err, addresses) => {
			if (err) {
				return reject(err);
			}
			const anyForbidden = addresses.some(({ address }) => isForbiddenAddress(address));
			resolve(!anyForbidden);
		});
	}).catch((_e) => {
		throw new HttpException({ message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST }, HttpStatus.FORBIDDEN);
	});
}
